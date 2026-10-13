import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma";
import { auditService } from "../audit/audit.service";
import { createPrivacyService } from "./privacy.service";
import { createPrivacyController } from "./privacy.controller";
import {
  createDsrBody,
  dsrListOut,
  dsrOut,
  dsrParams,
  eraseOut,
  exportOut,
  restrictionBody,
  restrictionOut,
  updateDsrBody,
} from "./privacy.schema";

export const privacyRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createPrivacyController(
    createPrivacyService({ db: prisma, audit: auditService.record })
  );

  app.get(
    "/api/admin/privacy/requests",
    { schema: { response: { 200: dsrListOut } } },
    c.listRequests
  );

  app.post(
    "/api/admin/privacy/requests",
    {
      onRequest: app.csrfProtection,
      schema: { body: createDsrBody, response: { 201: dsrOut } },
    },
    c.createRequest
  );

  app.put(
    "/api/admin/privacy/requests/:id",
    {
      onRequest: app.csrfProtection,
      schema: {
        params: dsrParams,
        body: updateDsrBody,
        response: { 200: dsrOut },
      },
    },
    c.updateStatus
  );

  app.post(
    "/api/admin/privacy/requests/:id/export",
    {
      onRequest: app.csrfProtection,
      schema: { params: dsrParams, response: { 200: exportOut } },
    },
    c.exportSubject
  );

  app.post(
    "/api/admin/privacy/requests/:id/erase",
    {
      onRequest: app.csrfProtection,
      schema: { params: dsrParams, response: { 200: eraseOut } },
    },
    c.eraseSubject
  );

  app.post(
    "/api/admin/privacy/restriction",
    {
      onRequest: app.csrfProtection,
      schema: { body: restrictionBody, response: { 200: restrictionOut } },
    },
    c.setRestriction
  );
};
