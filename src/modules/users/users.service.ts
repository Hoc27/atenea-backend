import type { PrismaClient } from "@prisma/client";
import { Errors } from "../../lib/errors";
import type { AuthUser } from "../../lib/auth";
import type { Ctx } from "../../lib/context";
import type { AuditEvent } from "../audit/audit.service";
import type {
  CreateUserBody,
  ResetPasswordBody,
  UpdateUserBody,
  ChangeOwnPasswordBody,
} from "./users.schema";

const publicSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

type Deps = {
  db: PrismaClient;
  hash: (password: string) => Promise<string>;
  verify: (plain: string, stored: string) => Promise<boolean>;
  audit: (event: AuditEvent) => Promise<void>;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createUsersService({ db, hash, verify, audit }: Deps) {
  async function record(
    ctx: Ctx,
    action: string,
    entityId: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    await audit({
      principalId: ctx.principal.id,
      principalRole: "ADMIN",
      action,
      entity: "Admin",
      entityId,
      requestId: ctx.requestId,
      ipTrunc: ctx.ipTrunc,
      meta,
    }).catch(() => undefined);
  }

  return {
    list() {
      return db.admin.findMany({
        orderBy: [{ deletedAt: "asc" }, { createdAt: "asc" }],
        take: 200,
        select: publicSelect,
      });
    },

    async create(ctx: Ctx, input: CreateUserBody) {
      const email = normalizeEmail(input.email);
      const existing = await db.admin.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) throw Errors.conflict("Ya existe un usuario con ese correo");

      const passwordHash = await hash(input.password);
      const user = await db.admin.create({
        data: {
          name: input.name.trim(),
          email,
          passwordHash,
        },
        select: publicSelect,
      });
      await record(ctx, "user.created", user.id, { email });
      return user;
    },

    async update(ctx: Ctx, id: string, input: UpdateUserBody) {
      const existing = await db.admin.findUnique({
        where: { id },
        select: { id: true, email: true },
      });
      if (!existing) throw Errors.notFound("Usuario");

      const email = normalizeEmail(input.email);
      if (email !== existing.email) {
        const clash = await db.admin.findUnique({
          where: { email },
          select: { id: true },
        });
        if (clash && clash.id !== id) {
          throw Errors.conflict("Ya existe un usuario con ese correo");
        }
      }

      const user = await db.admin.update({
        where: { id },
        data: { name: input.name.trim(), email },
        select: publicSelect,
      });
      await record(ctx, "user.updated", user.id, { email });
      return user;
    },

    async deactivate(ctx: Ctx, id: string) {
      if (id === ctx.principal.id) {
        throw Errors.badRequest("No puedes desactivar tu propia cuenta");
      }

      const existing = await db.admin.findUnique({
        where: { id },
        select: { id: true, deletedAt: true },
      });
      if (!existing) throw Errors.notFound("Usuario");
      if (existing.deletedAt) return;

      const activeAdmins = await db.admin.count({ where: { deletedAt: null } });
      if (activeAdmins <= 1) {
        throw Errors.badRequest(
          "No puedes desactivar al último administrador activo"
        );
      }

      await db.admin.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          // Invalida cualquier token emitido antes de la desactivación.
          sessionVersion: { increment: 1 },
        },
      });
      await record(ctx, "user.deactivated", id);
    },

    async restore(ctx: Ctx, id: string) {
      const existing = await db.admin.findUnique({
        where: { id },
        select: { id: true, deletedAt: true },
      });
      if (!existing) throw Errors.notFound("Usuario");

      const user = await db.admin.update({
        where: { id },
        data: { deletedAt: null },
        select: publicSelect,
      });
      await record(ctx, "user.reactivated", id);
      return user;
    },

    async resetPassword(ctx: Ctx, id: string, input: ResetPasswordBody) {
      if (id === ctx.principal.id) {
        throw Errors.badRequest(
          "Usa «Mi cuenta» para cambiar tu propia contraseña"
        );
      }

      const actor = await db.admin.findUnique({
        where: { id: ctx.principal.id },
        select: { id: true, passwordHash: true, deletedAt: true },
      });
      if (!actor || actor.deletedAt) {
        throw Errors.unauthorized("No autorizado");
      }

      const valid = await verify(input.adminPassword, actor.passwordHash);
      if (!valid) {
        throw Errors.badRequest(
          "Tu contraseña de administrador no es correcta"
        );
      }

      const target = await db.admin.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!target) throw Errors.notFound("Usuario");

      const passwordHash = await hash(input.newPassword);
      await db.admin.update({
        where: { id },
        data: {
          passwordHash,
          // Cierra las sesiones del usuario afectado.
          sessionVersion: { increment: 1 },
        },
      });
      await record(ctx, "user.password_reset", id);
      return { ok: true as const };
    },

    async changeOwnPassword(
      ctx: Ctx,
      input: ChangeOwnPasswordBody
    ): Promise<AuthUser> {
      const actor = await db.admin.findUnique({
        where: { id: ctx.principal.id },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          sessionVersion: true,
          deletedAt: true,
        },
      });
      if (!actor || actor.deletedAt) {
        throw Errors.unauthorized("No autorizado");
      }

      const valid = await verify(input.currentPassword, actor.passwordHash);
      if (!valid) {
        throw Errors.badRequest("La contraseña actual no es correcta");
      }

      const passwordHash = await hash(input.newPassword);
      const updated = await db.admin.update({
        where: { id: actor.id },
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
        },
        select: {
          id: true,
          email: true,
          name: true,
          sessionVersion: true,
        },
      });
      await record(ctx, "auth.password_changed", actor.id);
      return updated;
    },
  };
}

export type UsersService = ReturnType<typeof createUsersService>;
