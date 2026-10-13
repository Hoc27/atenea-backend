import { z } from "zod";

export const loginBody = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

export const csrfOut = z.object({ csrfToken: z.string() });
export const adminUserOut = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
});
export const loginOut = z.object({ user: adminUserOut });
export const logoutOut = z.object({ ok: z.literal(true) });
// Misma forma que `loginOut` para que el frontend use `user.id` igual en ambos.
export const meOut = z.object({ user: adminUserOut });

export type LoginBody = z.infer<typeof loginBody>;
export type AdminUser = z.infer<typeof adminUserOut>;
