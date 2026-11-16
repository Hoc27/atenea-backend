import type { Rep, Req } from "../../lib/http";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  authCookieFlags,
  type AuthUser,
} from "../../lib/auth";
import { getCtx } from "../../middlewares/auth.middleware";
import type { UsersService } from "./users.service";
import type {
  ChangeOwnPasswordBody,
  CreateUserBody,
  ResetPasswordBody,
  UpdateUserBody,
  UserIdParams,
} from "./users.schema";

type Deps = {
  signToken: (user: AuthUser) => string;
};

export function createUsersController(service: UsersService, deps: Deps) {
  return {
    list: async () => ({ items: await service.list() }),

    create: async (req: Req<{ body: CreateUserBody }>, reply: Rep) => {
      const user = await service.create(getCtx(req), req.body);
      reply.code(201);
      return user;
    },

    update: async (
      req: Req<{ params: UserIdParams; body: UpdateUserBody }>
    ) => service.update(getCtx(req), req.params.id, req.body),

    deactivate: async (req: Req<{ params: UserIdParams }>, reply: Rep) => {
      await service.deactivate(getCtx(req), req.params.id);
      reply.code(204);
    },

    restore: async (req: Req<{ params: UserIdParams }>) =>
      service.restore(getCtx(req), req.params.id),

    resetPassword: async (
      req: Req<{ params: UserIdParams; body: ResetPasswordBody }>
    ) => service.resetPassword(getCtx(req), req.params.id, req.body),

    changeOwnPassword: async (
      req: Req<{ body: ChangeOwnPasswordBody }>,
      reply: Rep
    ) => {
      const user = await service.changeOwnPassword(getCtx(req), req.body);
      // Mantiene viva esta sesión con el nuevo sv; el resto queda invalidado.
      const token = deps.signToken(user);
      reply.setCookie(AUTH_COOKIE_NAME, token, {
        ...authCookieFlags,
        maxAge: AUTH_COOKIE_MAX_AGE,
      });
      return { ok: true as const };
    },
  };
}
