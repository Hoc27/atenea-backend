import type { FastifyReply, FastifyRequest } from "fastify";
import { Errors } from "../lib/errors";
import { truncateIp, type Ctx, type PublicCtx } from "../lib/context";

// Deny-by-default: se ejecuta para toda ruta no pública (ver app.ts).
export async function authenticate(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    await reply.code(401).send({
      error: "No autorizado",
      code: "UNAUTHORIZED",
      requestId: req.id,
    });
  }
}

// Puente único entre Fastify y la lógica: contexto plano para los services.
export function getCtx(req: Pick<FastifyRequest, "user" | "id" | "ip">): Ctx {
  const user = req.user;
  if (!user) throw Errors.unauthorized("No autorizado");
  return {
    principal: { id: user.sub, role: "ADMIN" },
    requestId: req.id,
    ipTrunc: truncateIp(req.ip),
  };
}

// Contexto para rutas públicas (p. ej. formulario de admisión).
export function getPublicCtx(req: Pick<FastifyRequest, "id" | "ip">): PublicCtx {
  return { requestId: req.id, ipTrunc: truncateIp(req.ip) };
}
