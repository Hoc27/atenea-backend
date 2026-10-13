import { Prisma } from "@prisma/client";
import { encryptField, decryptField } from "./crypto";

// Cifra/descifra un objeto JSON arbitrario para almacenarlo en una columna Json.
// El texto cifrado lleva prefijo de versión (`v1:`), lo que permite rotar claves.
export function encryptJson(data: unknown): Prisma.InputJsonValue {
  return { v: 1, ciphertext: encryptField(JSON.stringify(data)) };
}

export function decryptJson(value: Prisma.JsonValue): Prisma.JsonValue {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "ciphertext" in value &&
    typeof (value as { ciphertext?: unknown }).ciphertext === "string"
  ) {
    return JSON.parse(
      decryptField((value as { ciphertext: string }).ciphertext)
    ) as Prisma.JsonValue;
  }
  // Filas heredadas (antes del cifrado) se devuelven tal cual.
  return value;
}
