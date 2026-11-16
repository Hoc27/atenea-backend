import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma";
import { verifyPassword } from "../../lib/password";
import { signAccessToken } from "../../lib/auth";
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

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createAuthController(
    createAuthService({
      db: prisma,
      verify: verifyPassword,
      audit: auditService.record,
    }),
    {
      signToken: (user) => signAccessToken(app, user),
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
