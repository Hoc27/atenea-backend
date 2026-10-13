import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { prisma } from "../../lib/prisma";
import { auditService } from "../audit/audit.service";
import { createAdmissionService } from "./admission.service";
import { createAdmissionController } from "./admission.controller";
import { sendAdmissionEmail } from "./admission.mailer";
import {
  admissionCreateBody,
  admissionCreateOut,
  admissionsListOut,
} from "./admission.schema";

export const admissionRoutes: FastifyPluginAsyncZod = async (app) => {
  const c = createAdmissionController(
    createAdmissionService({
      db: prisma,
      audit: auditService.record,
      sendEmail: sendAdmissionEmail,
    })
  );

  app.post(
    "/api/admission",
    {
      config: { public: true, rateLimit: { max: 5, timeWindow: "1 hour" } },
      schema: { body: admissionCreateBody, response: { 201: admissionCreateOut } },
    },
    c.create
  );

  app.get(
    "/api/admin/admissions",
    { schema: { response: { 200: admissionsListOut } } },
    c.listAdmin
  );
};
