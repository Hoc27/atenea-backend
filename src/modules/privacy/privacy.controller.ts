import type { Rep, Req } from "../../lib/http";
import { getCtx } from "../../middlewares/auth.middleware";
import type { PrivacyService } from "./privacy.service";
import type {
  CreateDsrBody,
  RestrictionBody,
  UpdateDsrBody,
} from "./privacy.schema";

type IdParams = { id: string };

export function createPrivacyController(service: PrivacyService) {
  return {
    listRequests: async () => ({ items: await service.listRequests() }),

    createRequest: async (req: Req<{ body: CreateDsrBody }>, reply: Rep) => {
      const request = await service.createRequest(getCtx(req), req.body);
      reply.code(201);
      return request;
    },

    updateStatus: async (
      req: Req<{ params: IdParams; body: UpdateDsrBody }>
    ) => service.updateStatus(getCtx(req), req.params.id, req.body.status),

    exportSubject: async (req: Req<{ params: IdParams }>) =>
      service.exportSubject(getCtx(req), req.params.id),

    eraseSubject: async (req: Req<{ params: IdParams }>) =>
      service.eraseSubject(getCtx(req), req.params.id),

    setRestriction: async (req: Req<{ body: RestrictionBody }>) =>
      service.setRestriction(getCtx(req), req.body),
  };
}
