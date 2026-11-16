import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import { Errors } from "../lib/errors";
import { truncateIp, type Ctx, type PublicCtx } from "../lib/context";

// Deny-by-default: se ejecuta para toda ruta no pública (ver app.ts).
// Además de verificar la firma del JWT, comprueba contra la BD que la cuenta
// siga activa y que la versión de sesión coincida. Así desactivar un usuario
// o cambiar su contraseña invalida los tokens ya emitidos.
export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await req.jwtVerify();
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.sub },
      select: {
        id: true,
        email: true,
        name: true,
        deletedAt: true,
        sessionVersion: true,
      },
    });
    if (
      !admin ||
      admin.deletedAt ||
      admin.sessionVersion !== (req.user.sv ?? 0)
    ) {
      throw new Error("Sesión inválida");
    }
    req.authAdmin = admin;
  } catch {
    await reply.code(401).send({
      error: "No autorizado",
      code: "UNAUTHORIZED",
      requestId: req.id,
    });
  }
}

// Puente único entre Fastify y la lógica: contexto plano para los services.
export function getCtx(
  req: Pick<FastifyRequest, "user" | "authAdmin" | "id" | "ip">
): Ctx {
  const principalId = req.authAdmin?.id ?? req.user?.sub;
  if (!principalId) throw Errors.unauthorized("No autorizado");
  return {
    principal: { id: principalId, role: "ADMIN" },
    requestId: req.id,
    ipTrunc: truncateIp(req.ip),
  };
}

// Contexto para rutas públicas (p. ej. formulario de admisión).
export function getPublicCtx(req: Pick<FastifyRequest, "id" | "ip">): PublicCtx {
  return { requestId: req.id, ipTrunc: truncateIp(req.ip) };
}
