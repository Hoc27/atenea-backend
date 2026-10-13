import type { Rep, Req } from "../../lib/http";
import { getPublicCtx } from "../../middlewares/auth.middleware";
import type { AuthService } from "./auth.service";
import type { AdminUser, LoginBody } from "./auth.schema";

type CookieFlags = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "none" | "lax";
  path: string;
};

type Deps = {
  cookieFlags: CookieFlags;
  signToken: (user: AdminUser) => string;
};

export function createAuthController(service: AuthService, deps: Deps) {
  return {
    login: async (req: Req<{ body: LoginBody }>, reply: Rep) => {
      const user = await service.login(getPublicCtx(req), req.body);
      const token = deps.signToken(user);
      reply.setCookie("token", token, {
        ...deps.cookieFlags,
        maxAge: 60 * 60 * 8,
      });
      return { user };
    },

    logout: async (_req: Req, reply: Rep) => {
      reply.clearCookie("token", deps.cookieFlags);
      return { ok: true as const };
    },

    me: async (req: Req) => ({ user: req.user }),
  };
}
