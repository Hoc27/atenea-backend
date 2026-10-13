import type { Rep, Req } from "../../lib/http";
import { truncateIp } from "../../lib/context";
import type { AdmissionService } from "./admission.service";
import type { AdmissionCreateBody } from "./admission.schema";

export function createAdmissionController(service: AdmissionService) {
  return {
    create: async (req: Req<{ body: AdmissionCreateBody }>, reply: Rep) => {
      const result = await service.create(
        req.body as Record<string, string>,
        req.id,
        truncateIp(req.ip)
      );
      reply.code(201);
      return result;
    },

    listAdmin: async () => ({ items: await service.listAdmin() }),
  };
}
