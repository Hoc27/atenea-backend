import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma";
import { hashPassword, verifyPassword } from "../../lib/password";
import { signAccessToken } from "../../lib/auth";
import { auditService } from "../audit/audit.service";
import { createUsersService } from "./users.service";
import { createUsersController } from "./users.controller";
import {
  adminAccountListOut,
  adminAccountOut,
  changeOwnPasswordBody,
  createUserBody,
  okOut,
  resetPasswordBody,
  updateUserBody,
  userIdParams,
} from "./users.schema";

export const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createUsersController(
    createUsersService({
      db: prisma,
      hash: hashPassword,
      verify: verifyPassword,
      audit: auditService.record,
    }),
    {
      signToken: (user) => signAccessToken(app, user),
    }
  );

  app.get(
    "/api/admin/users",
    { schema: { response: { 200: adminAccountListOut } } },
    c.list
  );

  app.post(
    "/api/admin/users",
    {
      onRequest: app.csrfProtection,
      schema: { body: createUserBody, response: { 201: adminAccountOut } },
    },
    c.create
  );

  app.put(
    "/api/admin/users/:id",
    {
      onRequest: app.csrfProtection,
      schema: {
        params: userIdParams,
        body: updateUserBody,
        response: { 200: adminAccountOut },
      },
    },
    c.update
  );

  app.delete(
    "/api/admin/users/:id",
    { onRequest: app.csrfProtection, schema: { params: userIdParams } },
    c.deactivate
  );

  app.post(
    "/api/admin/users/:id/restore",
    {
      onRequest: app.csrfProtection,
      schema: { params: userIdParams, response: { 200: adminAccountOut } },
    },
    c.restore
  );

  app.post(
    "/api/admin/users/:id/password",
    {
      onRequest: app.csrfProtection,
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: {
        params: userIdParams,
        body: resetPasswordBody,
        response: { 200: okOut },
      },
    },
    c.resetPassword
  );

  app.post(
    "/api/admin/me/password",
    {
      onRequest: app.csrfProtection,
      config: { rateLimit: { max: 5, timeWindow: "15 minutes" } },
      schema: { body: changeOwnPasswordBody, response: { 200: okOut } },
    },
    c.changeOwnPassword
  );
};
