import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { createDownloadsService } from "./downloads.service";
import { createDownloadsController } from "./downloads.controller";
import {
  adminDownloadsListOut,
  categoriesListOut,
  categoryOut,
  createCategoryBody,
  downloadParams,
  downloadWithCategoryOut,
  downloadsListOut,
  updateDownloadBody,
} from "./downloads.schema";

export const downloadsRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createDownloadsController(createDownloadsService(prisma));

  app.get(
    "/api/downloads",
    { config: { public: true }, schema: { response: { 200: downloadsListOut } } },
    c.listPublic
  );

  app.get(
    "/api/downloads/categories",
    { config: { public: true }, schema: { response: { 200: categoriesListOut } } },
    c.listCategories
  );

  app.get(
    "/api/admin/downloads",
    { schema: { response: { 200: adminDownloadsListOut } } },
    c.listAdmin
  );

  app.post(
    "/api/admin/downloads",
    {
      onRequest: app.csrfProtection,
      bodyLimit: env.UPLOAD_MAX_MB * 1024 * 1024,
      schema: { response: { 201: downloadWithCategoryOut } },
    },
    c.create
  );

  app.put(
    "/api/admin/downloads/:id",
    {
      onRequest: app.csrfProtection,
      schema: {
        params: downloadParams,
        body: updateDownloadBody,
        response: { 200: downloadWithCategoryOut },
      },
    },
    c.update
  );

  app.delete(
    "/api/admin/downloads/:id",
    { onRequest: app.csrfProtection, schema: { params: downloadParams } },
    c.remove
  );

  app.post(
    "/api/admin/downloads/categories",
    {
      onRequest: app.csrfProtection,
      schema: { body: createCategoryBody, response: { 201: categoryOut } },
    },
    c.createCategory
  );
};
