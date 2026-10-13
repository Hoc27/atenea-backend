import "@fastify/jwt";
import "fastify";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string; name: string };
    user: { sub: string; email: string; name: string };
  }
}

declare module "fastify" {
  interface FastifyContextConfig {
    // Ruta explícitamente pública (exenta del deny-by-default global).
    public?: boolean;
  }

  interface FastifyInstance {
    // Registro de rutas para el test de deny-by-default.
    routeRegistry: { method: string | string[]; url: string }[];
  }
}
