import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import { verifyPassword } from "../../lib/password";
import { isProduction } from "../../config/env";
import { ACCESS_TOKEN_TTL, JWT_AUDIENCE, JWT_ISSUER } from "../../lib/auth";
import { auditService } from "../audit/audit.service";
import { createAuthService } from "./auth.service";
import { createAuthController } from "./auth.controller";
import {
  csrfOut,
  loginBody,
  loginOut,
  logoutOut,
  meOut,
} from "./auth.schema";

// En producción el frontend y el backend viven en subdominios distintos,
// por lo que las cookies deben ser SameSite=None; Secure para viajar
// cross-site. En desarrollo (http) se usa "lax".
const cookieFlags = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
};

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createAuthController(
    createAuthService({
      db: prisma,
      verify: verifyPassword,
      audit: auditService.record,
    }),
    {
      cookieFlags,
      signToken: (user) =>
        app.jwt.sign(
          { sub: user.id, email: user.email, name: user.name },
          {
            expiresIn: ACCESS_TOKEN_TTL,
            jti: randomUUID(),
            iss: JWT_ISSUER,
            aud: JWT_AUDIENCE,
          }
        ),
    }
  );

  app.get(
    "/api/auth/csrf",
    { config: { public: true }, schema: { response: { 200: csrfOut } } },
    async (_req, reply) => ({ csrfToken: reply.generateCsrf() })
  );

  app.post(
    "/api/auth/login",
    {
      onRequest: app.csrfProtection,
      config: { public: true, rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: { body: loginBody, response: { 200: loginOut } },
    },
    c.login
  );

  app.post(
    "/api/auth/logout",
    {
      onRequest: app.csrfProtection,
      config: { public: true },
      schema: { response: { 200: logoutOut } },
    },
    c.logout
  );

  app.get(
    "/api/auth/me",
    { schema: { response: { 200: meOut } } },
    c.me
  );
};
