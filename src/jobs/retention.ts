import { env } from "../config/env";
import { prisma } from "../lib/prisma";

const MS_PER_DAY = 86_400_000;
const daysAgo = (days: number) => new Date(Date.now() - days * MS_PER_DAY);

export type RetentionResult = {
  dryRun: boolean;
  admissions: number;
  auditLogs: number;
};

// Idempotente: anonimiza solicitudes de admisión vencidas y purga auditoría
// antigua. Ejecutar en UNA sola instancia (p. ej. cron del panel), nunca en
// el arranque de la app.
export async function runRetention(
  opts: { dryRun?: boolean } = {}
): Promise<RetentionResult> {
  const dryRun = opts.dryRun ?? false;
  const admissionCutoff = daysAgo(env.ADMISSION_RETENTION_DAYS);
  const auditCutoff = daysAgo(env.AUDIT_RETENTION_DAYS);

  if (dryRun) {
    const [admissions, auditLogs] = await Promise.all([
      prisma.admissionRequest.count({
        where: { createdAt: { lt: admissionCutoff }, deletedAt: null },
      }),
      prisma.auditLog.count({ where: { at: { lt: auditCutoff } } }),
    ]);
    return { dryRun, admissions, auditLogs };
  }

  const [admissions, auditLogs] = await prisma.$transaction([
    prisma.admissionRequest.updateMany({
      where: { createdAt: { lt: admissionCutoff }, deletedAt: null },
      data: {
        studentName: "ANONIMIZADO",
        contactEmail: null,
        level: null,
        data: {},
        status: "expired",
        deletedAt: new Date(),
        restrictedAt: null,
      },
    }),
    prisma.auditLog.deleteMany({ where: { at: { lt: auditCutoff } } }),
  ]);

  return { dryRun, admissions: admissions.count, auditLogs: auditLogs.count };
}

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  runRetention({ dryRun })
    .then(async (result) => {
      console.log(JSON.stringify(result));
      await prisma.$disconnect();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
