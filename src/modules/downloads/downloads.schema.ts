import { z } from "zod";

export const downloadParams = z.object({ id: z.string().min(1) });

export const updateDownloadBody = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    categoryId: z.string().nullable().optional(),
    order: z.number().int().optional(),
    published: z.boolean().optional(),
  })
  .strict();

export const createCategoryBody = z
  .object({
    name: z.string().min(1),
    slug: z.string().min(1).max(60),
  })
  .strict();

export const categoryOut = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});

export const downloadOut = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  fileUrl: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number().int(),
  categoryId: z.string().nullable(),
  order: z.number().int(),
  published: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const downloadWithCategoryOut = downloadOut.extend({
  category: categoryOut.nullable(),
});

export const categoryWithDownloadsOut = categoryOut.extend({
  downloads: z.array(downloadOut),
});

export const downloadsListOut = z.object({
  items: z.array(downloadWithCategoryOut),
  categories: z.array(categoryWithDownloadsOut),
});

export const categoriesListOut = z.object({ items: z.array(categoryOut) });
export const adminDownloadsListOut = z.object({
  items: z.array(downloadWithCategoryOut),
});

export type DownloadParams = z.infer<typeof downloadParams>;
export type UpdateDownloadBody = z.infer<typeof updateDownloadBody>;
export type CreateCategoryBody = z.infer<typeof createCategoryBody>;
