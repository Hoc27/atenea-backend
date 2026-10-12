import type { FastifyInstance } from "fastify";
import { prisma } from "../db";
import { authenticate } from "../plugins/authenticate";
import { sendAdmissionEmail } from "../lib/mailer";

export async function admissionRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/api/admission",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
      schema: {
        body: {
          type: "object",
          required: ["alumnoNombre"],
          properties: {
            alumnoNombre: { type: "string", minLength: 1, maxLength: 200 },
          },
          additionalProperties: { type: "string" },
        },
      },
    },
    async (req, reply) => {
      const data = req.body as Record<string, string>;

      const contactEmail =
        data.padreEmail?.trim() || data.madreEmail?.trim() || data.acudienteEmail?.trim() || null;
      const level = data.nivel?.trim() || null;

      const record = await prisma.admissionRequest.create({
        data: {
          studentName: data.alumnoNombre.trim(),
          level,
          contactEmail,
          data: data as unknown as object,
        },
      });

      const emailed = await sendAdmissionEmail(data).catch(() => false);

      return reply.code(201).send({
        ok: true,
        id: record.id,
        emailed,
      });
    }
  );

  app.get("/api/admin/admissions", { preHandler: authenticate }, async () => {
    const items = await prisma.admissionRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { items };
  });
}
