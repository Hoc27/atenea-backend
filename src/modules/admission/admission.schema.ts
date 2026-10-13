import { z } from "zod";

// El formulario de admisión tiene muchos campos dinámicos: se exige
// `alumnoNombre` y se aceptan campos adicionales de tipo string.
export const admissionCreateBody = z
  .object({ alumnoNombre: z.string().min(1).max(200) })
  .catchall(z.string());

export const admissionCreateOut = z.object({
  ok: z.literal(true),
  id: z.string(),
  emailed: z.boolean(),
});

export const admissionOut = z.object({
  id: z.string(),
  studentName: z.string(),
  level: z.string().nullable(),
  contactEmail: z.string().nullable(),
  data: z.unknown(),
  status: z.string(),
  createdAt: z.date(),
});

export const admissionsListOut = z.object({ items: z.array(admissionOut) });

export type AdmissionCreateBody = z.infer<typeof admissionCreateBody>;
