import { z } from "zod";

export const dsarTypeEnum = z.enum([
  "ACCESS",
  "RECTIFICATION",
  "ERASURE",
  "RESTRICTION",
  "PORTABILITY",
  "OBJECTION",
]);

export const dsarStatusEnum = z.enum([
  "RECEIVED",
  "IN_PROGRESS",
  "COMPLETED",
  "REJECTED",
]);

export const dsrParams = z.object({ id: z.string().min(1) });

export const createDsrBody = z
  .object({
    type: dsarTypeEnum,
    subjectRef: z.string().min(1).max(200),
    notes: z.string().max(1000).optional(),
  })
  .strict();

export const updateDsrBody = z.object({ status: dsarStatusEnum }).strict();

export const restrictionBody = z
  .object({
    subjectRef: z.string().min(1).max(200),
    restricted: z.boolean(),
  })
  .strict();

export const dsrOut = z.object({
  id: z.string(),
  type: dsarTypeEnum,
  status: dsarStatusEnum,
  subjectRef: z.string().nullable(),
  receivedAt: z.date(),
  dueAt: z.date(),
  completedAt: z.date().nullable(),
  notes: z.string().nullable(),
});

export const dsrListOut = z.object({ items: z.array(dsrOut) });

export const exportOut = z.object({
  generatedAt: z.string(),
  subjectRef: z.string().nullable(),
  data: z.unknown(),
});

export const eraseOut = z.object({ erased: z.number().int() });
export const restrictionOut = z.object({ updated: z.number().int() });

export type CreateDsrBody = z.infer<typeof createDsrBody>;
export type UpdateDsrBody = z.infer<typeof updateDsrBody>;
export type RestrictionBody = z.infer<typeof restrictionBody>;
