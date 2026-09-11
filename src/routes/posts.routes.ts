import type { FastifyInstance } from "fastify";
import { prisma } from "../db";
import { authenticate } from "../plugins/authenticate";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

const postBody = {
  type: "object",
  required: ["title"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1 },
    slug: { type: "string", minLength: 1, maxLength: 100 },
    excerpt: { type: ["string", "null"] },
    content: { type: "string" },
    coverImage: { type: ["string", "null"] },
    category: { type: ["string", "null"] },
    published: { type: "boolean" },
    featured: { type: "boolean" },
  },
} as const;

export async function postsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/posts", async (req) => {
    const query = req.query as {
      featured?: string;
      category?: string;
      q?: string;
      limit?: string;
    };

    const where: Record<string, unknown> = { published: true };
    if (query.featured === "true") where.featured = true;
    if (query.category) where.category = query.category;
    if (query.q) {
      where.OR = [
        { title: { contains: query.q } },
        { excerpt: { contains: query.q } },
        { content: { contains: query.q } },
      ];
    }

    const take = query.limit ? Math.min(Number.parseInt(query.limit, 10), 100) : undefined;

    const items = await prisma.post.findMany({
      where,
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take,
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
    return { items };
  });

  app.get(
    "/api/posts/:slug",
    {
      schema: {
        params: {
          type: "object",
          required: ["slug"],
          additionalProperties: false,
          properties: { slug: { type: "string" } },
        },
      },
    },
    async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const post = await prisma.post.findFirst({
        where: { slug, published: true },
      });
      if (!post) return reply.code(404).send({ error: "No encontrado" });
      return post;
    }
  );

  // --- Admin ---

  app.get("/api/admin/posts", { preHandler: authenticate }, async () => {
    const items = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { items };
  });

  app.post(
    "/api/admin/posts",
    {
      onRequest: app.csrfProtection,
      preHandler: authenticate,
      schema: { body: postBody },
    },
    async (req, reply) => {
      const body = req.body as {
        title: string;
        slug?: string;
        excerpt?: string | null;
        content?: string;
        coverImage?: string | null;
        category?: string | null;
        published?: boolean;
        featured?: boolean;
      };

      const baseSlug = body.slug?.trim() || slugify(body.title);
      const slug = baseSlug || `post-${Date.now()}`;

      const exists = await prisma.post.findUnique({ where: { slug } });
      if (exists) {
        return reply.code(409).send({ error: "El slug ya existe" });
      }

      const published = body.published ?? false;
      const post = await prisma.post.create({
        data: {
          title: body.title,
          slug,
          excerpt: body.excerpt ?? null,
          content: body.content ?? "",
          coverImage: body.coverImage ?? null,
          category: body.category ?? null,
          published,
          featured: body.featured ?? false,
          publishedAt: published ? new Date() : null,
        },
      });
      return reply.code(201).send(post);
    }
  );

  app.put(
    "/api/admin/posts/:id",
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
            slug: { type: "string" },
            excerpt: { type: ["string", "null"] },
            content: { type: "string" },
            coverImage: { type: ["string", "null"] },
            category: { type: ["string", "null"] },
            published: { type: "boolean" },
            featured: { type: "boolean" },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as {
        title?: string;
        slug?: string;
        excerpt?: string | null;
        content?: string;
        coverImage?: string | null;
        category?: string | null;
        published?: boolean;
        featured?: boolean;
      };

      const existing = await prisma.post.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: "No encontrado" });

      if (body.slug && body.slug !== existing.slug) {
        const clash = await prisma.post.findUnique({ where: { slug: body.slug } });
        if (clash) return reply.code(409).send({ error: "El slug ya existe" });
      }

      const published = body.published ?? existing.published;
      const post = await prisma.post.update({
        where: { id },
        data: {
          title: body.title ?? existing.title,
          slug: body.slug ?? existing.slug,
          excerpt: body.excerpt === undefined ? existing.excerpt : body.excerpt,
          content: body.content ?? existing.content,
          coverImage: body.coverImage === undefined ? existing.coverImage : body.coverImage,
          category: body.category === undefined ? existing.category : body.category,
          published,
          featured: body.featured ?? existing.featured,
          publishedAt: published ? existing.publishedAt ?? new Date() : null,
        },
      });
      return post;
    }
  );

  app.delete(
    "/api/admin/posts/:id",
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
      await prisma.post.deleteMany({ where: { id } });
      return reply.code(204).send();
    }
  );
}
