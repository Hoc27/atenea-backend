import type { FastifyRequest } from "fastify";

// Tipos estructurales mínimos: evitan conflictos de genéricos entre los
// handlers y el ZodTypeProvider (mismo enfoque que la plantilla de la skill).
export type Req<Ext extends object = object> = Pick<
  FastifyRequest,
  "id" | "ip" | "user" | "parts"
> &
  Ext;

// El controller fija el estado con `reply.code(...)` y devuelve el cuerpo;
// Fastify lo serializa con el schema de respuesta.
export type Rep = {
  code(statusCode: number): unknown;
  setCookie(
    name: string,
    value: string,
    options?: Record<string, unknown>
  ): unknown;
  clearCookie(name: string, options?: Record<string, unknown>): unknown;
};
