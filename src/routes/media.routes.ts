import type { FastifyInstance } from "fastify";
import { rm } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db";
import { authenticate } from "../plugins/authenticate";
import { handleUpload } from "../lib/upload";
import { config } from "../config";

export async function mediaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/media", async (req) => {
    const query = req.query as {
      limit?: string;
      offset?: string;
      area?: string;
      q?: string;
    };

    const limit = query.limit ? Math.min(Number.parseInt(query.limit, 10), 200) : undefined;
    const offset = query.offset ? Math.max(Number.parseInt(query.offset, 10), 0) : undefined;

    const where: Record<string, unknown> = {};
    if (query.area) where.area = query.area;
    if (query.q) {
      where.OR = [
        { alt: { contains: query.q, mode: "insensitive" } },
        { area: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const [items, total, allAreas] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { order: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.media.count({ where }),
      prisma.media.findMany({
        select: { area: true },
        distinct: ["area"],
        orderBy: { area: "asc" },
      }),
    ]);

    const areas = allAreas
      .map((m) => m.area)
      .filter((a): a is string => Boolean(a));

    return { items, total, areas };
  });

  app.post(
    "/api/admin/media",
    { onRequest: app.csrfProtection, preHandler: authenticate },
    async (req, reply) => {
      const { fields, file } = await handleUpload(req, (mime) =>
        mime.startsWith("image/")
      );
      const order = fields.order ? Number.parseInt(fields.order, 10) : 0;
      const postId = fields.postId?.trim() || null;
      const item = await prisma.media.create({
        data: {
          url: file.url,
          alt: fields.alt?.trim() || null,
          area: fields.area?.trim() || null,
          order: Number.isFinite(order) ? order : 0,
          postId,
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
            postId: { type: ["string", "null"] },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as {
        alt?: string | null;
        area?: string | null;
        order?: number;
        postId?: string | null;
      };
      const existing = await prisma.media.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "No encontrado" });

      const item = await prisma.media.update({
        where: { id },
        data: {
          alt: body.alt === undefined ? existing.alt : body.alt,
          area: body.area === undefined ? existing.area : body.area,
          order: body.order ?? existing.order,
          postId: body.postId === undefined ? existing.postId : body.postId,
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
