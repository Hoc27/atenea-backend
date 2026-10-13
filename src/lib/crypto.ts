import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../config/env";

// Versionado de claves: para rotar, añade "v2" y cambia CURRENT.
// Los datos cifrados con versiones anteriores se siguen descifrando.
const KEYS: Record<string, Buffer> = {
  v1: Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex"),
};
const CURRENT = "v1";

export function encryptField(plain: string): string {
  const key = KEYS[CURRENT]!;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    CURRENT,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ct.toString("base64url"),
  ].join(":");
}

export function decryptField(payload: string): string {
  const [version, iv, tag, ct] = payload.split(":");
  const key = version ? KEYS[version] : undefined;
  if (!key || !iv || !tag || !ct) {
    throw new Error("Campo cifrado con formato inválido");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ct, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
