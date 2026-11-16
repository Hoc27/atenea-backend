import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { isProduction } from "../config/env";

// Configuración única del token de acceso, compartida por la firma
// (auth/users routes) y la verificación (registro de @fastify/jwt en app.ts).
export const JWT_ISSUER = "atenea-api";
export const JWT_AUDIENCE = "atenea-admin";
export const ACCESS_TOKEN_TTL = "8h";

export const AUTH_COOKIE_NAME = "token";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 8;

export const authCookieFlags = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  sessionVersion: number;
};

/** Firma un access token con el `sv` actual para poder invalidar sesiones. */
export function signAccessToken(app: FastifyInstance, user: AuthUser): string {
  return app.jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      sv: user.sessionVersion,
    },
    {
      expiresIn: ACCESS_TOKEN_TTL,
      jti: randomUUID(),
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
    }
  );
}
