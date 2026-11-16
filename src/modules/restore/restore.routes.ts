/**
 * Ruta de restauración puntual de archivos perdidos en el servidor.
 *
 * USO:
 *   POST /api/admin/restore-uploads
 *   Content-Type: multipart/form-data
 *   Authorization: Bearer <token>   (o cookie de sesión)
 *
 *   Envía los archivos con el campo "files" (múltiples).
 *   El nombre original del archivo se preserva tal cual, sin re-encodear.
 *
 * DESACTIVAR:
 *   En app.ts comenta la línea:  await app.register(restoreRoutes);
 */

import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { env } from "../../config/env";

export const restoreRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    "/api/admin/restore-uploads",
    {
      // Sin csrfProtection: se llama como herramienta puntual, no desde el panel.
      // La autenticación JWT sigue activa (deny-by-default en app.ts).
      bodyLimit: 500 * 1024 * 1024, // 500 MB por request
    },
    async (req, reply) => {
      await mkdir(env.UPLOAD_DIR, { recursive: true });

      const saved: string[] = [];
      const skipped: string[] = [];
      const errors: { name: string; reason: string }[] = [];

      for await (const part of req.parts()) {
        if (part.type !== "file") continue;

        const originalName = part.filename;

        if (!originalName) {
          part.file.resume();
          errors.push({ name: "(sin nombre)", reason: "Archivo sin nombre" });
          continue;
        }

        // Solo letras, números, guiones, puntos y guiones bajos. Sin path traversal.
        if (!/^[\w\-]+\.[a-zA-Z0-9]+$/.test(originalName)) {
          part.file.resume();
          errors.push({ name: originalName, reason: "Nombre de archivo inválido" });
          continue;
        }

        const dest = path.join(env.UPLOAD_DIR, originalName);

        // No sobreescribir archivos que ya existen.
        const exists = await stat(dest).then(() => true).catch(() => false);
        if (exists) {
          part.file.resume();
          skipped.push(originalName);
          continue;
        }

        try {
          await pipeline(part.file, createWriteStream(dest));
          saved.push(originalName);
        } catch (err) {
          errors.push({
            name: originalName,
            reason: err instanceof Error ? err.message : "Error desconocido",
          });
        }
      }

      return reply.code(200).send({ saved, skipped, errors });
    }
  );
};
