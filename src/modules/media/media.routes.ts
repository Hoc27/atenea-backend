import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { createMediaService } from "./media.service";
import { createMediaController } from "./media.controller";
import {
  listMediaQuery,
  mediaListOut,
  mediaOut,
  mediaParams,
  updateMediaBody,
} from "./media.schema";

export const mediaRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createMediaController(createMediaService(prisma));

  app.get(
    "/api/media",
    {
      config: { public: true },
      schema: { querystring: listMediaQuery, response: { 200: mediaListOut } },
    },
    c.list
  );

  app.post(
    "/api/admin/media",
    {
      onRequest: app.csrfProtection,
      bodyLimit: env.UPLOAD_MAX_MB * 1024 * 1024,
      schema: { response: { 201: mediaOut } },
    },
    c.create
  );

  app.put(
    "/api/admin/media/:id",
    {
      onRequest: app.csrfProtection,
      schema: {
        params: mediaParams,
        body: updateMediaBody,
        response: { 200: mediaOut },
      },
    },
    c.update
  );

  app.delete(
    "/api/admin/media/:id",
    { onRequest: app.csrfProtection, schema: { params: mediaParams } },
    c.remove
  );
};
