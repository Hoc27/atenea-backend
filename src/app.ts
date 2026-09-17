import Fastify from "fastify";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import csrfProtection from "@fastify/csrf-protection";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { config, isProduction } from "./config";
import { authRoutes } from "./routes/auth.routes";
import { contentRoutes } from "./routes/content.routes";
import { downloadsRoutes } from "./routes/downloads.routes";
import { postsRoutes } from "./routes/posts.routes";
import { mediaRoutes } from "./routes/media.routes";

export async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const app = Fastify({
    logger: {
      level: "info",
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['x-csrf-token']",
      ],
    },
    bodyLimit: config.UPLOAD_MAX_MB * 1024 * 1024,
    trustProxy: isProduction,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });

  // Lista blanca de orígenes permitidos, normalizada (sin espacios ni "/" final).
  const allowedOrigins = config.CORS_ORIGIN.split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  await app.register(cors, {
    origin(origin, cb) {
      // Peticiones sin Origin (curl, health checks, same-origin) se permiten.
      if (!origin) {
        cb(null, true);
        return;
      }
      const normalized = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalized)) {
        cb(null, true);
        return;
      }
      app.log.warn(
        { origin, allowedOrigins },
        "CORS: origen no permitido"
      );
      cb(null, false);
    },
    credentials: true,
  });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
  });

  await app.register(cookie);
  await app.register(csrfProtection, {
    cookieOpts: {
      httpOnly: true,
      // Cross-site (subdominios distintos) requiere SameSite=None; Secure.
      sameSite: isProduction ? "none" : "lax",
      path: "/",
      secure: isProduction,
    },
  });
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: "token", signed: false },
  });
  await app.register(multipart, {
    limits: {
      fileSize: config.UPLOAD_MAX_MB * 1024 * 1024,
      files: 1,
      fields: 30,
    },
  });
  await mkdir(config.UPLOAD_DIR, { recursive: true });
  await app.register(fastifyStatic, {
    root: path.resolve(config.UPLOAD_DIR),
    prefix: "/uploads/",
  });

  app.get("/api/health", async () => ({
    status: "ok",
    time: new Date().toISOString(),
  }));

  await app.register(authRoutes);
  await app.register(contentRoutes);
  await app.register(downloadsRoutes);
  await app.register(postsRoutes);
  await app.register(mediaRoutes);

  app.setErrorHandler((err: FastifyError, req: FastifyRequest, reply: FastifyReply) => {
    const statusCode =
      typeof err.statusCode === "number" && err.statusCode >= 400 && err.statusCode < 500
        ? err.statusCode
        : 500;
    if (statusCode >= 500) {
      req.log.error(err);
    }
    return reply.code(statusCode).send({
      error: statusCode >= 500 ? "Error interno del servidor" : err.message,
    });
  });

  return app;
}
