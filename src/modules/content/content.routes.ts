import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma";
import { createContentService } from "./content.service";
import { createContentController } from "./content.controller";
import {
  contentListOut,
  contentOut,
  contentParams,
  contentValueBody,
} from "./content.schema";

export const contentRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createContentController(createContentService(prisma));

  app.get(
    "/api/content",
    { config: { public: true }, schema: { response: { 200: contentListOut } } },
    c.list
  );

  app.get(
    "/api/content/:key",
    {
      config: { public: true },
      schema: { params: contentParams, response: { 200: contentOut } },
    },
    c.getByKey
  );

  app.put(
    "/api/admin/content/:key",
    {
      onRequest: app.csrfProtection,
      schema: {
        params: contentParams,
        body: contentValueBody,
        response: { 200: contentOut },
      },
    },
    c.upsert
  );

  app.delete(
    "/api/admin/content/:key",
    { onRequest: app.csrfProtection, schema: { params: contentParams } },
    c.remove
  );
};
