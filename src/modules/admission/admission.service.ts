import type { PrismaClient } from "@prisma/client";
import { encryptJson, decryptJson } from "../../lib/secure-json";
import type { AuditEvent } from "../audit/audit.service";

type Deps = {
  db: PrismaClient;
  audit: (event: AuditEvent) => Promise<void>;
  sendEmail: (data: Record<string, string>) => Promise<boolean>;
};

export function createAdmissionService({ db, audit, sendEmail }: Deps) {
  return {
    async create(
      data: Record<string, string>,
      requestId: string,
      ipTrunc?: string
    ) {
      const contactEmail =
        data.padreEmail?.trim() ||
        data.madreEmail?.trim() ||
        data.acudienteEmail?.trim() ||
        null;
      const level = data.nivel?.trim() || null;

      const record = await db.admissionRequest.create({
        data: {
          studentName: data.alumnoNombre.trim(),
          level,
          contactEmail,
          data: encryptJson(data),
        },
      });

      await audit({
        action: "admission.create",
        entity: "AdmissionRequest",
        entityId: record.id,
        requestId,
        ipTrunc,
      }).catch(() => undefined);

      const emailed = await sendEmail(data).catch(() => false);
      return { ok: true as const, id: record.id, emailed };
    },

    async listAdmin() {
      const rows = await db.admissionRequest.findMany({
        orderBy: { createdAt: "desc" },
      });
      return rows.map((r) => ({ ...r, data: decryptJson(r.data) }));
    },
  };
}

export type AdmissionService = ReturnType<typeof createAdmissionService>;
