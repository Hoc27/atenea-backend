import type { PrismaClient } from "@prisma/client";
import { Errors } from "../../lib/errors";

export function createContentService(db: PrismaClient) {
  return {
    list() {
      return db.contentBlock.findMany({ orderBy: { key: "asc" } });
    },

    async getByKey(key: string) {
      const block = await db.contentBlock.findUnique({ where: { key } });
      if (!block) throw Errors.notFound("Contenido");
      return block;
    },

    upsert(key: string, value: string) {
      return db.contentBlock.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    },

    async remove(key: string) {
      await db.contentBlock.deleteMany({ where: { key } });
    },
  };
}

export type ContentService = ReturnType<typeof createContentService>;
