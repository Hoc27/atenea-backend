import type { Prisma, PrismaClient } from "@prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";
import { Errors } from "../../lib/errors";
import { env } from "../../config/env";
import type { UploadedFile } from "../../lib/upload";
import type { ListMediaQuery, UpdateMediaBody } from "./media.schema";

export type MediaUploadFields = {
  alt?: string;
  area?: string;
  order?: string;
  postId?: string;
};

export function createMediaService(db: PrismaClient) {
  return {
    async list(query: ListMediaQuery) {
      const where: Prisma.MediaWhereInput = {};
      if (query.area) where.area = query.area;
      if (query.q) {
        where.OR = [
          { alt: { contains: query.q, mode: "insensitive" } },
          { area: { contains: query.q, mode: "insensitive" } },
        ];
      }

      const [items, total, allAreas] = await Promise.all([
        db.media.findMany({
          where,
          orderBy: { order: "asc" },
          take: query.limit,
          skip: query.offset,
        }),
        db.media.count({ where }),
        db.media.findMany({
          select: { area: true },
          distinct: ["area"],
          orderBy: { area: "asc" },
        }),
      ]);

      const areas = allAreas
        .map((m) => m.area)
        .filter((a): a is string => Boolean(a));

      return { items, total, areas };
    },

    async create(file: UploadedFile, fields: MediaUploadFields) {
      const order = fields.order ? Number.parseInt(fields.order, 10) : 0;
      return db.media.create({
        data: {
          url: file.url,
          alt: fields.alt?.trim() || null,
          area: fields.area?.trim() || null,
          order: Number.isFinite(order) ? order : 0,
          postId: fields.postId?.trim() || null,
        },
      });
    },

    async update(id: string, body: UpdateMediaBody) {
      const existing = await db.media.findUnique({ where: { id } });
      if (!existing) throw Errors.notFound("Elemento de galería");

      return db.media.update({
        where: { id },
        data: {
          alt: body.alt === undefined ? existing.alt : body.alt,
          area: body.area === undefined ? existing.area : body.area,
          order: body.order ?? existing.order,
          postId: body.postId === undefined ? existing.postId : body.postId,
        },
      });
    },

    async remove(id: string) {
      const existing = await db.media.findUnique({ where: { id } });
      if (!existing) throw Errors.notFound("Elemento de galería");

      await db.media.delete({ where: { id } });
      const name = existing.url.split("/").pop();
      if (name) await rm(path.join(env.UPLOAD_DIR, name), { force: true });
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
