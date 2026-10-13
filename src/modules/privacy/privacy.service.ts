import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { Errors } from "../../lib/errors";
import { decryptJson } from "../../lib/secure-json";
import type { Ctx } from "../../lib/context";
import type { AuditEvent } from "../audit/audit.service";
import type {
  CreateDsrBody,
  RestrictionBody,
} from "./privacy.schema";

type Deps = { db: PrismaClient; audit: (event: AuditEvent) => Promise<void> };

const oneMonthFromNow = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
};

// En este dominio el titular (familia/alumno) no tiene cuenta: los derechos se
// gestionan desde el panel admin, referenciando al titular por su email.
export function createPrivacyService({ db, audit }: Deps) {
  const base = (
    ctx: Ctx,
    action: string,
    extra: Partial<AuditEvent> = {}
  ): AuditEvent => ({
    principalId: ctx.principal.id,
    principalRole: ctx.principal.role,
    action,
    requestId: ctx.requestId,
    ipTrunc: ctx.ipTrunc,
    ...extra,
  });

  return {
    listRequests() {
      return db.dataSubjectRequest.findMany({ orderBy: { receivedAt: "desc" } });
    },

    async createRequest(ctx: Ctx, input: CreateDsrBody) {
      const request = await db.dataSubjectRequest.create({
        data: {
          type: input.type,
          subjectRef: input.subjectRef,
          notes: input.notes ?? null,
          dueAt: oneMonthFromNow(),
        },
      });
      await audit(
        base(ctx, "privacy.request.create", {
          entity: "DataSubjectRequest",
          entityId: request.id,
        })
      ).catch(() => undefined);
      return request;
    },

    async updateStatus(
      ctx: Ctx,
      id: string,
      status: "RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED"
    ) {
      const existing = await db.dataSubjectRequest.findUnique({ where: { id } });
      if (!existing) throw Errors.notFound("Solicitud");

      const request = await db.dataSubjectRequest.update({
        where: { id },
        data: {
          status,
          completedAt:
            status === "COMPLETED" || status === "REJECTED" ? new Date() : null,
        },
      });
      await audit(
        base(ctx, "privacy.request.status", {
          entity: "DataSubjectRequest",
          entityId: id,
          meta: { status },
        })
      ).catch(() => undefined);
      return request;
    },

    // Art. 15 (acceso) y 20 (portabilidad): exporta los datos del titular.
    async exportSubject(ctx: Ctx, id: string) {
      const dsr = await db.dataSubjectRequest.findUnique({ where: { id } });
      if (!dsr) throw Errors.notFound("Solicitud");
      if (!dsr.subjectRef) {
        throw Errors.badRequest("La solicitud no tiene subjectRef");
      }

      const rows = await db.admissionRequest.findMany({
        where: { contactEmail: dsr.subjectRef },
      });
      const data = rows.map((r) => ({
        id: r.id,
        studentName: r.studentName,
        level: r.level,
        contactEmail: r.contactEmail,
        status: r.status,
        createdAt: r.createdAt,
        form: decryptJson(r.data),
      }));

      await db.dataSubjectRequest.update({
        where: { id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await audit(
        base(ctx, "privacy.export", {
          entity: "AdmissionRequest",
          meta: { count: data.length },
        })
      ).catch(() => undefined);

      return {
        generatedAt: new Date().toISOString(),
        subjectRef: dsr.subjectRef,
        data,
      };
    },

    // Art. 17 (supresión): anonimización transaccional.
    async eraseSubject(ctx: Ctx, id: string) {
      const dsr = await db.dataSubjectRequest.findUnique({ where: { id } });
      if (!dsr) throw Errors.notFound("Solicitud");
      if (!dsr.subjectRef) {
        throw Errors.badRequest("La solicitud no tiene subjectRef");
      }

      const anonymized = `deleted+${randomUUID()}@invalid`;
      const [erased] = await db.$transaction([
        db.admissionRequest.updateMany({
          where: { contactEmail: dsr.subjectRef, deletedAt: null },
          data: {
            studentName: "ANONIMIZADO",
            contactEmail: anonymized,
            level: null,
            data: {},
            status: "erased",
            deletedAt: new Date(),
            restrictedAt: null,
          },
        }),
        db.dataSubjectRequest.update({
          where: { id },
          data: { status: "COMPLETED", completedAt: new Date() },
        }),
      ]);

      await audit(
        base(ctx, "privacy.erase", {
          entity: "AdmissionRequest",
          meta: { count: erased.count },
        })
      ).catch(() => undefined);
      return { erased: erased.count };
    },

    // Art. 18 (limitación): marca/levanta restrictedAt.
    async setRestriction(ctx: Ctx, input: RestrictionBody) {
      const [updated] = await db.$transaction([
        db.admissionRequest.updateMany({
          where: { contactEmail: input.subjectRef, deletedAt: null },
          data: { restrictedAt: input.restricted ? new Date() : null },
        }),
        db.dataSubjectRequest.create({
          data: {
            type: "RESTRICTION",
            subjectRef: input.subjectRef,
            dueAt: oneMonthFromNow(),
            status: "COMPLETED",
            completedAt: new Date(),
          },
        }),
      ]);

      await audit(
        base(ctx, "privacy.restriction", {
          entity: "AdmissionRequest",
          meta: { restricted: input.restricted, count: updated.count },
        })
      ).catch(() => undefined);
      return { updated: updated.count };
    },
  };
}

export type PrivacyService = ReturnType<typeof createPrivacyService>;
