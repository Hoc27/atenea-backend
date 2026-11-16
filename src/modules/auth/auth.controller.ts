import type { Rep, Req } from "../../lib/http";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_COOKIE_NAME,
  authCookieFlags,
  type AuthUser,
} from "../../lib/auth";
import { Errors } from "../../lib/errors";
import { getPublicCtx } from "../../middlewares/auth.middleware";
import type { AuthService } from "./auth.service";
import type { LoginBody } from "./auth.schema";

type Deps = {
  signToken: (user: AuthUser) => string;
};

export function createAuthController(service: AuthService, deps: Deps) {
  return {
    login: async (req: Req<{ body: LoginBody }>, reply: Rep) => {
      const user = await service.login(getPublicCtx(req), req.body);
      const token = deps.signToken(user);
      reply.setCookie(AUTH_COOKIE_NAME, token, {
        ...authCookieFlags,
        maxAge: AUTH_COOKIE_MAX_AGE,
      });
      return { user: { id: user.id, email: user.email, name: user.name } };
    },

    logout: async (_req: Req, reply: Rep) => {
      reply.clearCookie(AUTH_COOKIE_NAME, authCookieFlags);
      return { ok: true as const };
    },

    me: async (req: Req) => {
      const admin = req.authAdmin;
      if (!admin) throw Errors.unauthorized("No autorizado");
      return {
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
        },
      };
    },
  };
}
