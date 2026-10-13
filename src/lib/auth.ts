// Configuración única del token de acceso, compartida por la firma
// (auth.routes.ts) y la verificación (registro de @fastify/jwt en app.ts).
export const JWT_ISSUER = "atenea-api";
export const JWT_AUDIENCE = "atenea-admin";
export const ACCESS_TOKEN_TTL = "8h";
