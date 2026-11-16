import "@fastify/jwt";
import "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string; name: string; sv?: number };
    user: { sub: string; email: string; name: string; sv?: number };
  }
}

declare module "fastify" {
  interface FastifyContextConfig {
    // Ruta explícitamente pública (exenta del deny-by-default global).
    public?: boolean;
  }

  interface FastifyRequest {
    // Admin verificado contra la BD en cada petición autenticada.
    authAdmin?: {
      id: string;
      email: string;
      name: string;
      deletedAt: Date | null;
      sessionVersion: number;
    };
  }

  interface FastifyInstance {
    // Registro de rutas para el test de deny-by-default.
    routeRegistry: { method: string | string[]; url: string }[];
  }
}
