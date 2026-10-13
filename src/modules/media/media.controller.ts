import type { Rep, Req } from "../../lib/http";
import { handleUpload } from "../../lib/upload";
import type { MediaService } from "./media.service";
import type { ListMediaQuery, MediaParams, UpdateMediaBody } from "./media.schema";

export function createMediaController(service: MediaService) {
  return {
    list: async (req: Req<{ query: ListMediaQuery }>) => service.list(req.query),

    create: async (req: Req, reply: Rep) => {
      const { fields, file } = await handleUpload(req, (mime) =>
        mime.startsWith("image/")
      );
      const item = await service.create(file, {
        alt: fields.alt,
        area: fields.area,
        order: fields.order,
        postId: fields.postId,
      });
      reply.code(201);
      return item;
    },

    update: async (req: Req<{ params: MediaParams; body: UpdateMediaBody }>) =>
      service.update(req.params.id, req.body),

    remove: async (req: Req<{ params: MediaParams }>, reply: Rep) => {
      await service.remove(req.params.id);
      reply.code(204);
    },
  };
}
