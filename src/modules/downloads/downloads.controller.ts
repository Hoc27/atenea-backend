import type { Rep, Req } from "../../lib/http";
import { handleUpload } from "../../lib/upload";
import type { DownloadsService } from "./downloads.service";
import type {
  CreateCategoryBody,
  DownloadParams,
  UpdateDownloadBody,
} from "./downloads.schema";

export function createDownloadsController(service: DownloadsService) {
  return {
    listPublic: async () => service.listPublic(),

    listCategories: async () => ({ items: await service.listCategories() }),

    listAdmin: async () => ({ items: await service.listAdmin() }),

    create: async (req: Req, reply: Rep) => {
      const { fields, file } = await handleUpload(req);
      const item = await service.create(file, {
        title: fields.title,
        description: fields.description,
        categoryId: fields.categoryId,
        order: fields.order,
        published: fields.published,
      });
      reply.code(201);
      return item;
    },

    update: async (
      req: Req<{ params: DownloadParams; body: UpdateDownloadBody }>
    ) => service.update(req.params.id, req.body),

    remove: async (req: Req<{ params: DownloadParams }>, reply: Rep) => {
      await service.remove(req.params.id);
      reply.code(204);
    },

    createCategory: async (
      req: Req<{ body: CreateCategoryBody }>,
      reply: Rep
    ) => {
      const category = await service.createCategory(req.body.name, req.body.slug);
      reply.code(201);
      return category;
    },
  };
}
