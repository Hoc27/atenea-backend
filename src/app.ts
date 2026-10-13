import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import csrfProtection from "@fastify/csrf-protection";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { Prisma } from "@prisma/client";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { env, isProduction } from "./config/env";
import { AppError } from "./lib/errors";
import { JWT_AUDIENCE, JWT_ISSUER } from "./lib/auth";
import { truncateIp } from "./lib/context";
import { authenticate } from "./middlewares/auth.middleware";
import { auditService } from "./modules/audit/audit.service";
import { authRoutes } from "./modules/auth/auth.routes";
import { contentRoutes } from "./modules/content/content.routes";
import { postsRoutes } from "./modules/posts/posts.routes";
import { mediaRoutes } from "./modules/media/media.routes";
import { downloadsRoutes } from "./modules/downloads/downloads.routes";
import { admissionRoutes } from "./modules/admission/admission.routes";
import { privacyRoutes } from "./modules/privacy/privacy.routes";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "development" ? "info" : "warn",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-csrf-token']",
        "res.headers['set-cookie']",
        "*.password",
        "*.passwordHash",
      ],
    },
    // 1 MB por defecto; las rutas de subida lo elevan a UPLOAD_MAX_MB.
    bodyLimit: 1_048_576,
    // Fastify no tipa `number` aunque proxy-addr sí lo acepta en runtime.
    trustProxy: env.TRUST_PROXY as unknown as boolean,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Debe definirse antes de registrar los módulos: los plugins creados con
  // `register` heredan el error handler vigente en el momento de su carga.
  app.setErrorHandler((err, req, reply) => {
    const requestId = req.id;

    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.status(400).send({
        error: "Datos inválidos",
        code: "VALIDATION_ERROR",
        requestId,
        details: err.validation.map((v) => ({
          path: v.instancePath,
          message: v.message,
        })),
      });
    }

    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({
        error: err.message,
        code: err.code,
        requestId,
        details: err.details,
      });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return reply
          .status(409)
          .send({ error: "El recurso ya existe", code: "CONFLICT", requestId });
      }
      if (err.code === "P2025") {
        return reply
          .status(404)
          .send({ error: "Recurso no encontrado", code: "NOT_FOUND", requestId });
      }
    }

    if (isResponseSerializationError(err)) {
      req.log.error({ err }, "Error de serialización de respuesta");
      return reply.status(500).send({
        error: "Error interno del servidor",
        code: "INTERNAL",
        requestId,
      });
    }

    // Errores 4xx propios de Fastify/plugins (429, 413, etc.).
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status >= 400 && status < 500) {
      const message = err instanceof Error ? err.message : "Solicitud no válida";
      return reply
        .status(status)
        .send({ error: message, code: "REQUEST_ERROR", requestId });
    }

    req.log.error({ err }, "Error no controlado");
    return reply.status(500).send({
      error: "Error interno del servidor",
      code: "INTERNAL",
      requestId,
    });
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  // Lista blanca de orígenes permitidos, normalizada (sin espacios ni "/" final).
  const allowedOrigins = env.CORS_ORIGIN.split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  await app.register(cors, {
    origin(origin, cb) {
      if (!origin) {
        cb(null, true);
        return;
      }
      const normalized = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalized)) {
        cb(null, true);
        return;
      }
      app.log.warn({ origin }, "CORS: origen no permitido");
      cb(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE"],
  });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    // Los archivos estáticos (/uploads) no cuentan contra el límite.
    allowList: (req) => req.url.startsWith("/uploads/"),
  });

  await app.register(cookie);
  await app.register(csrfProtection, {
    cookieOpts: {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      secure: isProduction,
    },
  });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: "token", signed: false },
    verify: { allowedIss: JWT_ISSUER, allowedAud: JWT_AUDIENCE },
  });
  await app.register(multipart, {
    limits: {
      fileSize: env.UPLOAD_MAX_MB * 1024 * 1024,
      files: 1,
      fields: 30,
    },
  });

  await mkdir(env.UPLOAD_DIR, { recursive: true });
  await app.register(fastifyStatic, {
    root: path.resolve(env.UPLOAD_DIR),
    prefix: "/uploads/",
    cacheControl: true,
    immutable: true,
    maxAge: "30 days",
    setHeaders(res, filePath) {
      // Imágenes: inline (galería). Resto de archivos: forzar descarga y
      // bloquear la ejecución de contenido incrustado.
      if (!/\.(jpe?g|png|webp|gif)$/i.test(filePath)) {
        res.header("Content-Disposition", "attachment");
        res.header("Content-Security-Policy", "default-src 'none'; sandbox");
      }
      res.header("X-Content-Type-Options", "nosniff");
    },
  });

  // Deny-by-default: toda ruta exige autenticación salvo que se marque
  // explícitamente con `config: { public: true }` o sea un archivo estático.
  app.addHook("onRequest", async (req, reply) => {
    if (req.url.startsWith("/uploads/")) return;
    const routeConfig = (req.routeOptions?.config ?? {}) as { public?: boolean };
    if (routeConfig.public === true) return;
    await authenticate(req, reply);
  });

  // Registro de rutas para el test de deny-by-default.
  const routeRegistry: { method: string | string[]; url: string }[] = [];
  app.decorate("routeRegistry", routeRegistry);
  app.addHook("onRoute", (route) => {
    routeRegistry.push({ method: route.method, url: route.url });
  });

  // Auditoría de acciones administrativas (append-only, solo INSERT).
  app.addHook("onResponse", async (req, reply) => {
    if (env.NODE_ENV === "test") return;
    if (!req.url.startsWith("/api/admin")) return;
    try {
      await auditService.record({
        principalId: req.user?.sub,
        principalRole: "ADMIN",
        action: `${req.method} ${req.routeOptions?.url ?? req.url}`,
        requestId: req.id,
        ipTrunc: truncateIp(req.ip),
        meta: { status: reply.statusCode },
      });
    } catch (err) {
      req.log.error({ err }, "No se pudo registrar la auditoría");
    }
  });

  app.get(
    "/api/health",
    { config: { public: true } },
    async () => ({ status: "ok", time: new Date().toISOString() })
  );

  await app.register(authRoutes);
  await app.register(contentRoutes);
  await app.register(postsRoutes);
  await app.register(mediaRoutes);
  await app.register(downloadsRoutes);
  await app.register(admissionRoutes);
  await app.register(privacyRoutes);

  return app;
}
