import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";

export type AuditEvent = {
  principalId?: string;
  principalRole?: string;
  action: string;
  entity?: string;
  entityId?: string;
  requestId?: string;
  ipTrunc?: string;
  // Identificadores y nombres de campo; NUNCA valores personales.
  meta?: Record<string, unknown>;
};

// Append-only: la aplicación solo inserta.
export const auditService = {
  async record(event: AuditEvent): Promise<void> {
    await prisma.auditLog.create({
      data: {
        principalId: event.principalId,
        principalRole: event.principalRole,
        action: event.action,
        entity: event.entity,
        entityId: event.entityId,
        requestId: event.requestId,
        ipTrunc: event.ipTrunc,
        meta: event.meta as Prisma.InputJsonValue | undefined,
      },
    });
  },
};
