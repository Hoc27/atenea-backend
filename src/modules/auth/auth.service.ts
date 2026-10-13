import type { PrismaClient } from "@prisma/client";
import { Errors } from "../../lib/errors";
import type { PublicCtx } from "../../lib/context";
import type { AuditEvent } from "../audit/audit.service";

type Deps = {
  db: PrismaClient;
  verify: (plain: string, stored: string) => Promise<boolean>;
  audit: (event: AuditEvent) => Promise<void>;
};

export function createAuthService({ db, verify, audit }: Deps) {
  return {
    async login(ctx: PublicCtx, input: { email: string; password: string }) {
      const admin = await db.admin.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      const active = admin && !admin.deletedAt ? admin : null;
      const valid = active
        ? await verify(input.password, active.passwordHash)
        : false;

      if (!active || !valid) {
        await audit({
          action: "auth.login_failed",
          requestId: ctx.requestId,
          ipTrunc: ctx.ipTrunc,
        }).catch(() => undefined);
        // Mismo error exista o no la cuenta (anti-enumeración).
        throw Errors.unauthorized("Credenciales inválidas");
      }

      await audit({
        principalId: active.id,
        principalRole: "ADMIN",
        action: "auth.login",
        requestId: ctx.requestId,
        ipTrunc: ctx.ipTrunc,
      }).catch(() => undefined);

      return { id: active.id, email: active.email, name: active.name };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
