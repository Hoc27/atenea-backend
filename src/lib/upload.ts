import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { config } from "../config";

const ALLOWED_MIME: Record<string, string> = {
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

export type UploadedFile = {
  url: string;
  name: string;
  mime: string;
  size: number;
};

export type UploadResult = {
  fields: Record<string, string>;
  file: UploadedFile;
};

function httpError(message: string, statusCode: number): Error {
  return Object.assign(new Error(message), { statusCode });
}

export async function saveUpload(
  file: MultipartFile,
  accept?: (mime: string) => boolean
): Promise<UploadedFile> {
  const ext = ALLOWED_MIME[file.mimetype];
  if (!ext || (accept && !accept(file.mimetype))) {
    file.file.resume();
    throw httpError("Tipo de archivo no permitido", 400);
  }

  const name = `${randomUUID()}${ext}`;
  await mkdir(config.UPLOAD_DIR, { recursive: true });
  const destination = path.join(config.UPLOAD_DIR, name);
  await pipeline(file.file, createWriteStream(destination));
  const info = await stat(destination);

  return {
    url: `/uploads/${name}`,
    name,
    mime: file.mimetype,
    size: info.size,
  };
}

export async function handleUpload(
  request: FastifyRequest,
  accept?: (mime: string) => boolean
): Promise<UploadResult> {
  const fields: Record<string, string> = {};
  let fileResult: UploadedFile | null = null;

  for await (const part of request.parts()) {
    if (part.type === "file") {
      if (fileResult) {
        part.file.resume();
        continue;
      }
      fileResult = await saveUpload(part, accept);
    } else {
      fields[part.fieldname] = String(part.value);
    }
  }

  if (!fileResult) {
    throw httpError("Archivo requerido", 400);
  }

  return { fields, file: fileResult };
}
