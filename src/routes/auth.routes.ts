import type { FastifyInstance } from "fastify";
import { prisma } from "../db";
import { verifyPassword } from "../security";
import { authenticate } from "../plugins/authenticate";
import { isProduction } from "../config";

const cookieFlags = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  path: "/",
};

const loginBody = {
  type: "object",
  required: ["email", "password"],
  additionalProperties: false,
  properties: {
    email: { type: "string", format: "email" },
    password: { type: "string", minLength: 1 },
  },
} as const;

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/auth/csrf", async (_req, reply) => {
    return { csrfToken: reply.generateCsrf() };
  });

  app.post(
    "/api/auth/login",
    {
      onRequest: app.csrfProtection,
      schema: { body: loginBody },
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const { email, password } = req.body as { email: string; password: string };
      const admin = await prisma.admin.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!admin || !(await verifyPassword(password, admin.passwordHash))) {
        return reply.code(401).send({ error: "Credenciales inválidas" });
      }
      const token = app.jwt.sign({
        sub: admin.id,
        email: admin.email,
        name: admin.name,
      });
      reply.setCookie("token", token, { ...cookieFlags, maxAge: 60 * 60 * 8 });
      return { user: { id: admin.id, email: admin.email, name: admin.name } };
    }
  );

  app.post(
    "/api/auth/logout",
    { onRequest: app.csrfProtection },
    async (_req, reply) => {
      reply.clearCookie("token", { path: "/" });
      return { ok: true };
    }
  );

  app.get("/api/auth/me", { preHandler: authenticate }, async (req) => {
    return { user: req.user };
  });
}
