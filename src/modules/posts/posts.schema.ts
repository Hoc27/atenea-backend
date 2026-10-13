import { z } from "zod";
import { mediaOut } from "../media/media.schema";

export const postParams = z.object({ id: z.string().min(1) });
export const postSlugParams = z.object({ slug: z.string().min(1) });

export const listPostsQuery = z.object({
  featured: z.enum(["true", "false"]).optional(),
  category: z.string().max(120).optional(),
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createPostBody = z
  .object({
    title: z.string().min(1),
    slug: z.string().min(1).max(100).optional(),
    excerpt: z.string().nullable().optional(),
    content: z.string().optional(),
    coverImage: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    published: z.boolean().optional(),
    featured: z.boolean().optional(),
  })
  .strict();

export const updatePostBody = z
  .object({
    title: z.string().min(1).optional(),
    slug: z.string().min(1).max(100).optional(),
    excerpt: z.string().nullable().optional(),
    content: z.string().optional(),
    coverImage: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    published: z.boolean().optional(),
    featured: z.boolean().optional(),
  })
  .strict();

export const postImagesBody = z
  .object({ imageIds: z.array(z.string().min(1)) })
  .strict();

export const postListItemOut = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  coverImage: z.string().nullable(),
  category: z.string().nullable(),
  featured: z.boolean(),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
});

export const postOut = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  content: z.string(),
  coverImage: z.string().nullable(),
  category: z.string().nullable(),
  published: z.boolean(),
  featured: z.boolean(),
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  images: z.array(mediaOut),
});

export const postListOut = z.object({ items: z.array(postListItemOut) });
export const adminPostListOut = z.object({ items: z.array(postOut) });

export type PostParams = z.infer<typeof postParams>;
export type PostSlugParams = z.infer<typeof postSlugParams>;
export type ListPostsQuery = z.infer<typeof listPostsQuery>;
export type CreatePostBody = z.infer<typeof createPostBody>;
export type UpdatePostBody = z.infer<typeof updatePostBody>;
export type PostImagesBody = z.infer<typeof postImagesBody>;
