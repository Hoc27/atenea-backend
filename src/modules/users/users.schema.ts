import { z } from "zod";

export const userIdParams = z.object({ id: z.string().min(1) });

const nameSchema = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(120, "El nombre es demasiado largo");

const emailSchema = z
  .string()
  .trim()
  .email("Correo inválido")
  .max(254, "El correo es demasiado largo");

export const passwordSchema = z
  .string()
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .max(128, "La contraseña es demasiado larga")
  .regex(/[a-z]/, "La contraseña debe incluir una minúscula")
  .regex(/[A-Z]/, "La contraseña debe incluir una mayúscula")
  .regex(/[0-9]/, "La contraseña debe incluir un número")
  .regex(/[^A-Za-z0-9]/, "La contraseña debe incluir un símbolo");

export const createUserBody = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();

export const updateUserBody = z
  .object({
    name: nameSchema,
    email: emailSchema,
  })
  .strict();

export const resetPasswordBody = z
  .object({
    adminPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .strict();

export const changeOwnPasswordBody = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
  })
  .strict();

export const adminAccountOut = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export const adminAccountListOut = z.object({
  items: z.array(adminAccountOut),
});

export const okOut = z.object({ ok: z.literal(true) });

export type UserIdParams = z.infer<typeof userIdParams>;
export type CreateUserBody = z.infer<typeof createUserBody>;
export type UpdateUserBody = z.infer<typeof updateUserBody>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;
export type ChangeOwnPasswordBody = z.infer<typeof changeOwnPasswordBody>;
