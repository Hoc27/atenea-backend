import { fromBuffer, fromFile } from "file-type";

// Whitelist por MIME real (detectado por magic bytes), no por extensión ni por
// el Content-Type que declare el cliente.
export const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/zip": ".zip",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function isAllowedMime(mime: string | undefined): boolean {
  return !!mime && mime in ALLOWED_MIME;
}

export function extForMime(mime: string): string {
  return ALLOWED_MIME[mime] ?? "";
}

type DetectedType = { mime: string; ext: string } | undefined;

export async function detectTypeFromFile(filePath: string): Promise<DetectedType> {
  return fromFile(filePath);
}

export async function detectTypeFromBuffer(buffer: Uint8Array): Promise<DetectedType> {
  return fromBuffer(buffer);
}
