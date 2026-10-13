// Contexto plano que reciben los services (sin dependencias de Fastify).
// Dominio actual: un único rol de administrador.
export type Role = "ADMIN";
export type Principal = { id: string; role: Role };
export type Ctx = { principal: Principal; requestId: string; ipTrunc?: string };
// Contexto de rutas públicas (sin principal).
export type PublicCtx = { requestId: string; ipTrunc?: string };

// Minimiza la IP en logs/auditoría (último octeto a 0 / últimos grupos IPv6).
export function truncateIp(ip: string): string {
  if (ip.includes(":")) {
    return `${ip.split(":").slice(0, 3).join(":")}::`;
  }
  const parts = ip.split(".");
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : "unknown";
}
