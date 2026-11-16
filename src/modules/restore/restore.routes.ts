/**
 * Ruta de restauración puntual de archivos perdidos en el servidor.
 * Acepta UN archivo por request para evitar timeouts en Traefik/Dokploy.
 *
 * DESACTIVAR cuando termine:
 *   En app.ts comenta:  await app.register(restoreRoutes);
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
      bodyLimit: env.UPLOAD_MAX_MB * 1024 * 1024,
    },
    async (req, reply) => {
      await mkdir(env.UPLOAD_DIR, { recursive: true });

      let saved: string | null = null;
      let skipped = false;
      let error: string | null = null;

      for await (const part of req.parts()) {
        if (part.type !== "file") continue;

        const originalName = part.filename;

        if (!originalName) {
          part.file.resume();
          error = "Archivo sin nombre";
          break;
        }

        // Bloquea path traversal y nombres fuera de charset UUID/extensión.
        if (!/^[\w\-]+\.[a-zA-Z0-9]+$/.test(originalName)) {
          part.file.resume();
          error = "Nombre de archivo inválido";
          break;
        }

        const dest = path.join(env.UPLOAD_DIR, originalName);

        const exists = await stat(dest).then(() => true).catch(() => false);
        if (exists) {
          part.file.resume();
          skipped = true;
          break;
        }

        try {
          await pipeline(part.file, createWriteStream(dest));
          saved = originalName;
        } catch (err) {
          error = err instanceof Error ? err.message : "Error desconocido";
        }
        break; // solo procesamos el primer archivo
      }

      return reply.code(200).send({ saved, skipped, error });
    }
  );
};
