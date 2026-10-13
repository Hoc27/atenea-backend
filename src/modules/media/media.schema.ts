import { z } from "zod";

export const mediaParams = z.object({ id: z.string().min(1) });

// Query con strip (no strict): los navegadores añaden parámetros ruidosos.
export const listMediaQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  area: z.string().max(120).optional(),
  q: z.string().max(120).optional(),
});

export const updateMediaBody = z
  .object({
    alt: z.string().nullable().optional(),
    area: z.string().nullable().optional(),
    order: z.number().int().optional(),
    postId: z.string().nullable().optional(),
  })
  .strict();

export const mediaOut = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string().nullable(),
  area: z.string().nullable(),
  order: z.number().int(),
  postId: z.string().nullable(),
  createdAt: z.date(),
});

export const mediaListOut = z.object({
  items: z.array(mediaOut),
  total: z.number().int(),
  areas: z.array(z.string()),
});

export type MediaParams = z.infer<typeof mediaParams>;
export type ListMediaQuery = z.infer<typeof listMediaQuery>;
export type UpdateMediaBody = z.infer<typeof updateMediaBody>;
