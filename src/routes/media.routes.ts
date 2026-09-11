import type { FastifyInstance } from "fastify";
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db";
import { authenticate } from "../plugins/authenticate";
import { handleUpload } from "../lib/upload";
import { config } from "../config";

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/media", async () => {
    const items = await prisma.media.findMany({ orderBy: { order: "asc" } });
    return { items };
  });

  app.post(
    "/api/admin/media",
    { onRequest: app.csrfProtection, preHandler: authenticate },
    async (req, reply) => {
      const { fields, file } = await handleUpload(req, (mime) =>
        mime.startsWith("image/")
      );
      const order = fields.order ? Number.parseInt(fields.order, 10) : 0;
      const item = await prisma.media.create({
        data: {
          url: file.url,
          alt: fields.alt?.trim() || null,
          area: fields.area?.trim() || null,
          order: Number.isFinite(order) ? order : 0,
        },
      });
      return reply.code(201).send(item);
    }
  );

  app.put(
    "/api/admin/media/:id",
    {
      onRequest: app.csrfProtection,
      preHandler: authenticate,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          additionalProperties: false,
          properties: { id: { type: "string" } },
        },
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            alt: { type: ["string", "null"] },
            area: { type: ["string", "null"] },
            order: { type: "integer" },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as { alt?: string | null; area?: string | null; order?: number };
      const existing = await prisma.media.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "No encontrado" });

      const item = await prisma.media.update({
        where: { id },
        data: {
          alt: body.alt === undefined ? existing.alt : body.alt,
          area: body.area === undefined ? existing.area : body.area,
          order: body.order ?? existing.order,
        },
      });
      return item;
    }
  );

  app.delete(
    "/api/admin/media/:id",
    {
      onRequest: app.csrfProtection,
      preHandler: authenticate,
      schema: {
        params: {
          type: "object",
          required: ["id"],
          additionalProperties: false,
          properties: { id: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const existing = await prisma.media.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "No encontrado" });

      await prisma.media.delete({ where: { id } });
      const name = existing.url.split("/").pop();
      if (name) await rm(path.join(config.UPLOAD_DIR, name), { force: true });
      return reply.code(204).send();
    }
  );
}
