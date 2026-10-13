import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import sharp from "sharp";
import type { FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { env } from "../config/env";
import {
  detectTypeFromFile,
  extForMime,
  isAllowedMime,
} from "./file-validation";

type PartsRequest = Pick<FastifyRequest, "parts">;

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
  await mkdir(env.UPLOAD_DIR, { recursive: true });

  // 1) Guardar en temporal sin confiar en el MIME declarado por el cliente.
  const tempPath = path.join(env.UPLOAD_DIR, `${randomUUID()}.part`);
  await pipeline(file.file, createWriteStream(tempPath));

  // 2) Validar el tipo real por magic bytes (whitelist + filtro del llamador).
  const detected = await detectTypeFromFile(tempPath);
  if (
    !detected ||
    !isAllowedMime(detected.mime) ||
    (accept && !accept(detected.mime))
  ) {
    await rm(tempPath, { force: true });
    throw httpError("Tipo de archivo no permitido", 400);
  }

  // 3) Imágenes: re-encodear a WebP (elimina metadatos/contenido incrustado).
  const isImage = detected.mime.startsWith("image/");
  let finalName: string;
  let mime: string;

  if (isImage) {
    finalName = `${randomUUID()}.webp`;
    await sharp(tempPath).rotate().webp({ quality: 90 }).toFile(
      path.join(env.UPLOAD_DIR, finalName)
    );
    await rm(tempPath, { force: true });
    mime = "image/webp";
  } else {
    finalName = `${randomUUID()}${extForMime(detected.mime)}`;
    await rename(tempPath, path.join(env.UPLOAD_DIR, finalName));
    mime = detected.mime;
  }

  const info = await stat(path.join(env.UPLOAD_DIR, finalName));
  return { url: `/uploads/${finalName}`, name: finalName, mime, size: info.size };
}

export async function handleUpload(
  request: PartsRequest,
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
