import type { FastifyInstance } from "fastify";
import { prisma } from "../db";
import { authenticate } from "../plugins/authenticate";

const keyParams = {
  type: "object",
  required: ["key"],
  additionalProperties: false,
  properties: { key: { type: "string", minLength: 1, maxLength: 120 } },
} as const;

const valueBody = {
  type: "object",
  required: ["value"],
  additionalProperties: false,
  properties: { value: { type: "string" } },
} as const;

export async function contentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/content", async () => {
    const items = await prisma.contentBlock.findMany({
      orderBy: { key: "asc" },
    });
    return { items };
  });

  app.get(
    "/api/content/:key",
    { schema: { params: keyParams } },
    async (req, reply) => {
      const { key } = req.params as { key: string };
      const block = await prisma.contentBlock.findUnique({ where: { key } });
      if (!block) return reply.code(404).send({ error: "No encontrado" });
      return block;
    }
  );

  app.put(
    "/api/admin/content/:key",
    {
      onRequest: app.csrfProtection,
      preHandler: authenticate,
      schema: { params: keyParams, body: valueBody },
    },
    async (req) => {
      const { key } = req.params as { key: string };
      const { value } = req.body as { value: string };
      return prisma.contentBlock.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  );

  app.delete(
    "/api/admin/content/:key",
    {
      onRequest: app.csrfProtection,
      preHandler: authenticate,
      schema: { params: keyParams },
    },
    async (req, reply) => {
      const { key } = req.params as { key: string };
      await prisma.contentBlock.deleteMany({ where: { key } });
      return reply.code(204).send();
    }
  );
}
