import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma";
import { createPostsService } from "./posts.service";
import { createPostsController } from "./posts.controller";
import {
  adminPostListOut,
  createPostBody,
  listPostsQuery,
  postImagesBody,
  postListOut,
  postOut,
  postParams,
  postSlugParams,
  updatePostBody,
} from "./posts.schema";

export const postsRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createPostsController(createPostsService(prisma));

  app.get(
    "/api/posts",
    {
      config: { public: true },
      schema: { querystring: listPostsQuery, response: { 200: postListOut } },
    },
    c.listPublic
  );

  app.get(
    "/api/posts/:slug",
    {
      config: { public: true },
      schema: { params: postSlugParams, response: { 200: postOut } },
    },
    c.getBySlug
  );

  app.get(
    "/api/admin/posts",
    { schema: { response: { 200: adminPostListOut } } },
    c.listAdmin
  );

  app.post(
    "/api/admin/posts",
    {
      onRequest: app.csrfProtection,
      schema: { body: createPostBody, response: { 201: postOut } },
    },
    c.create
  );

  app.put(
    "/api/admin/posts/:id",
    {
      onRequest: app.csrfProtection,
      schema: {
        params: postParams,
        body: updatePostBody,
        response: { 200: postOut },
      },
    },
    c.update
  );

  app.put(
    "/api/admin/posts/:id/images",
    {
      onRequest: app.csrfProtection,
      schema: {
        params: postParams,
        body: postImagesBody,
        response: { 200: postOut },
      },
    },
    c.setImages
  );

  app.delete(
    "/api/admin/posts/:id",
    { onRequest: app.csrfProtection, schema: { params: postParams } },
    c.remove
  );
};
