import type { PrismaClient } from "@prisma/client";
import { rm } from "node:fs/promises";
import path from "node:path";
import { Errors } from "../../lib/errors";
import { env } from "../../config/env";
import type { UploadedFile } from "../../lib/upload";
import type { UpdateDownloadBody } from "./downloads.schema";

export type DownloadUploadFields = {
  title?: string;
  description?: string;
  categoryId?: string;
  order?: string;
  published?: string;
};

const withCategory = { category: true } as const;

export function createDownloadsService(db: PrismaClient) {
  return {
    async listPublic() {
      const [items, categories] = await Promise.all([
        db.download.findMany({
          where: { published: true },
          orderBy: [{ order: "asc" }, { createdAt: "desc" }],
          include: withCategory,
        }),
        db.downloadCategory.findMany({
          orderBy: { name: "asc" },
          include: { downloads: { where: { published: true } } },
        }),
      ]);
      return { items, categories };
    },

    listCategories() {
      return db.downloadCategory.findMany({ orderBy: { name: "asc" } });
    },

    listAdmin() {
      return db.download.findMany({
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: withCategory,
      });
    },

    async create(file: UploadedFile, fields: DownloadUploadFields) {
      const title = (fields.title ?? "").trim();
      if (!title) throw Errors.badRequest("El título es requerido");

      const categoryId = fields.categoryId?.trim() || null;
      const order = fields.order ? Number.parseInt(fields.order, 10) : 0;
      const published = fields.published !== "false";

      if (categoryId) {
        const category = await db.downloadCategory.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          await rm(path.join(env.UPLOAD_DIR, file.name), { force: true });
          throw Errors.badRequest("Categoría inválida");
        }
      }

      return db.download.create({
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
        include: withCategory,
      });
    },

    async update(id: string, body: UpdateDownloadBody) {
      const existing = await db.download.findUnique({ where: { id } });
      if (!existing) throw Errors.notFound("Descargable");

      return db.download.update({
        where: { id },
        data: {
          title: body.title ?? existing.title,
          description: body.description ?? existing.description,
          categoryId:
            body.categoryId === undefined ? existing.categoryId : body.categoryId,
          order: body.order ?? existing.order,
          published: body.published ?? existing.published,
        },
        include: withCategory,
      });
    },

    async remove(id: string) {
      const existing = await db.download.findUnique({ where: { id } });
      if (!existing) throw Errors.notFound("Descargable");

      await db.download.delete({ where: { id } });
      await rm(path.join(env.UPLOAD_DIR, existing.fileName), { force: true });
    },

    createCategory(name: string, slug: string) {
      return db.downloadCategory.create({ data: { name, slug: slug.toLowerCase() } });
    },
  };
}

export type DownloadsService = ReturnType<typeof createDownloadsService>;
