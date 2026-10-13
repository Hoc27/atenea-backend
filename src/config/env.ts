import "dotenv/config";
import { z } from "zod";

// 32 bytes en hexadecimal (64 caracteres). Generar con: openssl rand -hex 32
const hex32 = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, "Debe ser 32 bytes en hexadecimal (64 caracteres)");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET debe tener al menos 32 caracteres"),
  // Clave de cifrado de campos sensibles (AES-256-GCM). No vive en la BD.
  FIELD_ENCRYPTION_KEY: hex32,
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // Nº de proxies de confianza delante de la app (ej. Nginx = 1). No usar `true`.
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  ADMIN_EMAIL: z.string().email().default("admin@institutoatenea.edu.pa"),
  // Sin valor por defecto: solo lo usa el seed y debe ser fuerte (>= 12).
  ADMIN_PASSWORD: z
    .string()
    .min(12, "ADMIN_PASSWORD debe tener al menos 12 caracteres")
    .optional(),
  ADMIN_NAME: z.string().default("Administrador"),
  UPLOAD_DIR: z.string().default("uploads"),
  UPLOAD_MAX_MB: z.coerce.number().int().positive().default(20),
  // Retención (días). Decisión de negocio: ajustar según política/ley.
  ADMISSION_RETENTION_DAYS: z.coerce.number().int().positive().default(730),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
  ADMISSION_EMAIL: z.string().email().default("admisiones@institutoatenea.edu.pa"),
  FROM_EMAIL: z.string().email().default("no-reply@institutoatenea.edu.pa"),
  RESEND_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Mostrar solo qué variables fallan, nunca sus valores.
  console.error("Configuración de entorno inválida:");
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
