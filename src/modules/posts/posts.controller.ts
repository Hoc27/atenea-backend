import type { Rep, Req } from "../../lib/http";
import type { PostsService } from "./posts.service";
import type {
  CreatePostBody,
  ListPostsQuery,
  PostImagesBody,
  PostParams,
  PostSlugParams,
  UpdatePostBody,
} from "./posts.schema";

export function createPostsController(service: PostsService) {
  return {
    listPublic: async (req: Req<{ query: ListPostsQuery }>) => ({
      items: await service.listPublic(req.query),
    }),

    getBySlug: async (req: Req<{ params: PostSlugParams }>) =>
      service.getBySlug(req.params.slug),

    listAdmin: async () => ({ items: await service.listAdmin() }),

    create: async (req: Req<{ body: CreatePostBody }>, reply: Rep) => {
      const post = await service.create(req.body);
      reply.code(201);
      return post;
    },

    update: async (req: Req<{ params: PostParams; body: UpdatePostBody }>) =>
      service.update(req.params.id, req.body),

    setImages: async (req: Req<{ params: PostParams; body: PostImagesBody }>) =>
      service.setImages(req.params.id, req.body.imageIds),

    remove: async (req: Req<{ params: PostParams }>, reply: Rep) => {
      await service.remove(req.params.id);
      reply.code(204);
    },
  };
}
