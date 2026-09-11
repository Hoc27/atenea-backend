import type { FastifyInstance } from "fastify";
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db";
import { authenticate } from "../plugins/authenticate";
import { handleUpload } from "../lib/upload";
import { config } from "../config";

export async function downloadsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/downloads", async () => {
    const [items, categories] = await Promise.all([
      prisma.download.findMany({
        where: { published: true },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: { category: true },
      }),
      prisma.downloadCategory.findMany({
        orderBy: { name: "asc" },
        include: { downloads: { where: { published: true } } },
      }),
    ]);
    return { items, categories };
  });

  app.get("/api/downloads/categories", async () => {
    const categories = await prisma.downloadCategory.findMany({
      orderBy: { name: "asc" },
    });
    return { items: categories };
  });

  // --- Admin ---

  app.get(
    "/api/admin/downloads",
    { preHandler: authenticate },
    async () => {
      const items = await prisma.download.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: { category: true },
      });
      return { items };
    }
  );

  app.post(
    "/api/admin/downloads",
    { onRequest: app.csrfProtection, preHandler: authenticate },
    async (req, reply) => {
      const { fields, file } = await handleUpload(req);
      const title = (fields.title ?? "").trim();
      if (!title) {
        return reply.code(400).send({ error: "El título es requerido" });
      }

      const categoryId = fields.categoryId?.trim() || null;
      const order = fields.order ? Number.parseInt(fields.order, 10) : 0;
      const published = fields.published !== "false";

      if (categoryId) {
        const category = await prisma.downloadCategory.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          await rm(path.join(config.UPLOAD_DIR, file.name), { force: true });
          return reply.code(400).send({ error: "Categoría inválida" });
        }
      }

      const item = await prisma.download.create({
        data: {
          title,
          description: fields.description?.trim() || null,
          fileUrl: file.url,
          fileName: file.name,
          mimeType: file.mime,
          size: file.size,
          categoryId,
          order: Number.isFinite(order) ? order : 0,
          published,
        },
        include: { category: true },
      });

      return reply.code(201).send(item);
    }
  );

  app.put(
    "/api/admin/downloads/:id",
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
            title: { type: "string" },
            description: { type: "string" },
            categoryId: { type: ["string", "null"] },
            order: { type: "integer" },
            published: { type: "boolean" },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as {
        title?: string;
        description?: string;
        categoryId?: string | null;
        order?: number;
        published?: boolean;
      };

      const existing = await prisma.download.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "No encontrado" });

      const item = await prisma.download.update({
        where: { id },
        data: {
          title: body.title ?? existing.title,
          description: body.description ?? existing.description,
          categoryId: body.categoryId === undefined ? existing.categoryId : body.categoryId,
          order: body.order ?? existing.order,
          published: body.published ?? existing.published,
        },
        include: { category: true },
      });
      return item;
    }
  );

  app.delete(
    "/api/admin/downloads/:id",
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
      const existing = await prisma.download.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "No encontrado" });

      await prisma.download.delete({ where: { id } });
      await rm(path.join(config.UPLOAD_DIR, existing.fileName), { force: true });
      return reply.code(204).send();
    }
  );

  app.post(
    "/api/admin/downloads/categories",
    {
      onRequest: app.csrfProtection,
      preHandler: authenticate,
      schema: {
        body: {
          type: "object",
          required: ["name", "slug"],
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1 },
            slug: { type: "string", minLength: 1, maxLength: 60 },
          },
        },
      },
    },
    async (req, reply) => {
      const { name, slug } = req.body as { name: string; slug: string };
      const category = await prisma.downloadCategory.create({
        data: { name, slug: slug.toLowerCase() },
      });
      return reply.code(201).send(category);
    }
  );
}
