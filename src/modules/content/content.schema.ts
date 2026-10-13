import { z } from "zod";

export const contentParams = z.object({ key: z.string().min(1).max(120) });

export const contentValueBody = z.object({ value: z.string() }).strict();

export const contentOut = z.object({
  key: z.string(),
  value: z.string(),
  updatedAt: z.date(),
});

export const contentListOut = z.object({ items: z.array(contentOut) });

export type ContentParams = z.infer<typeof contentParams>;
export type ContentValueBody = z.infer<typeof contentValueBody>;
