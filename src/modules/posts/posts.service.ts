import type { Prisma, PrismaClient } from "@prisma/client";
import { Errors } from "../../lib/errors";
import type {
  CreatePostBody,
  ListPostsQuery,
  UpdatePostBody,
} from "./posts.schema";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

const withImages = { images: { orderBy: { order: "asc" } } } as const;

export function createPostsService(db: PrismaClient) {
  return {
    listPublic(query: ListPostsQuery) {
      const where: Prisma.PostWhereInput = { published: true };
      if (query.featured === "true") where.featured = true;
      if (query.category) where.category = query.category;
      if (query.q) {
        where.OR = [
          { title: { contains: query.q } },
          { excerpt: { contains: query.q } },
          { content: { contains: query.q } },
        ];
      }

      return db.post.findMany({
        where,
        orderBy: [
          { featured: "desc" },
          { publishedAt: "desc" },
          { createdAt: "desc" },
        ],
        take: query.limit,
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          category: true,
          featured: true,
          publishedAt: true,
          createdAt: true,
        },
      });
    },

    async getBySlug(slug: string) {
      const post = await db.post.findFirst({
        where: { slug, published: true },
        include: withImages,
      });
      if (!post) throw Errors.notFound("Noticia");
      return post;
    },

    listAdmin() {
      return db.post.findMany({
        orderBy: { createdAt: "desc" },
        include: withImages,
      });
    },

    async create(input: CreatePostBody) {
      const baseSlug = input.slug?.trim() || slugify(input.title);
      const slug = baseSlug || `post-${Date.now()}`;

      const exists = await db.post.findUnique({ where: { slug } });
      if (exists) throw Errors.conflict("El slug ya existe");

      const published = input.published ?? false;
      return db.post.create({
        data: {
          title: input.title,
          slug,
          excerpt: input.excerpt ?? null,
          content: input.content ?? "",
          coverImage: input.coverImage ?? null,
          category: input.category ?? null,
          published,
          featured: input.featured ?? false,
          publishedAt: published ? new Date() : null,
        },
        include: withImages,
      });
    },

    async update(id: string, input: UpdatePostBody) {
      const existing = await db.post.findUnique({ where: { id } });
      if (!existing) throw Errors.notFound("Noticia");

      const nextSlug = input.slug?.trim() || existing.slug;
      if (nextSlug !== existing.slug) {
        const clash = await db.post.findUnique({ where: { slug: nextSlug } });
        if (clash) throw Errors.conflict("El slug ya existe");
      }

      const published = input.published ?? existing.published;
      return db.post.update({
        where: { id },
        data: {
          title: input.title ?? existing.title,
          slug: nextSlug,
          excerpt: input.excerpt === undefined ? existing.excerpt : input.excerpt,
          content: input.content ?? existing.content,
          coverImage:
            input.coverImage === undefined ? existing.coverImage : input.coverImage,
          category: input.category === undefined ? existing.category : input.category,
          published,
          featured: input.featured ?? existing.featured,
          publishedAt: published ? existing.publishedAt ?? new Date() : null,
        },
        include: withImages,
      });
    },

    async setImages(id: string, imageIds: string[]) {
      const existing = await db.post.findUnique({ where: { id } });
      if (!existing) throw Errors.notFound("Noticia");

      await db.$transaction(async (tx) => {
        await tx.media.updateMany({
          where: { postId: id },
          data: { postId: null },
        });
        for (let i = 0; i < imageIds.length; i++) {
          await tx.media.update({
            where: { id: imageIds[i] },
            data: { postId: id, order: i },
          });
        }
      });

      const post = await db.post.findUnique({ where: { id }, include: withImages });
      if (!post) throw Errors.notFound("Noticia");
      return post;
    },

    async remove(id: string) {
      await db.post.deleteMany({ where: { id } });
    },
  };
}

export type PostsService = ReturnType<typeof createPostsService>;
