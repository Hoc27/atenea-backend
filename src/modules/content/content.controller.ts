import type { Rep, Req } from "../../lib/http";
import type { ContentService } from "./content.service";
import type { ContentParams, ContentValueBody } from "./content.schema";

export function createContentController(service: ContentService) {
  return {
    list: async () => ({ items: await service.list() }),

    getByKey: async (req: Req<{ params: ContentParams }>) =>
      service.getByKey(req.params.key),

    upsert: async (req: Req<{ params: ContentParams; body: ContentValueBody }>) =>
      service.upsert(req.params.key, req.body.value),

    remove: async (req: Req<{ params: ContentParams }>, reply: Rep) => {
      await service.remove(req.params.key);
      reply.code(204);
    },
  };
}
