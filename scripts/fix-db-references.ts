import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const covers = [
  { slug: "feria-familiar", area: "feria-familiar", alt: "Feria Familiar — foto 1" },
  {
    slug: "festival-folklorico-2026",
    area: "festival-folklorico",
    alt: "Festival Folklórico 2026 — foto 1",
  },
  {
    slug: "bellas-artes-recital-2026",
    area: "festival-de-arte",
    alt: "Presentación de Bellas Artes y Recital 2026 — foto 1",
  },
];

const brokenDownloadUrls = [
  "/uploads/formulario-admision.pdf",
  "/uploads/reglamento-interno.pdf",
  "/uploads/calendario-escolar.pdf",
];

async function main(): Promise<void> {
  for (const c of covers) {
    const cover = await prisma.media.findFirst({
      where: { area: c.area, alt: c.alt },
    });
    if (!cover) {
      console.log(`❌ No se encontró portada para ${c.slug}`);
      continue;
    }
    await prisma.post.update({
      where: { slug: c.slug },
      data: { coverImage: cover.url },
    });
    console.log(`✅ ${c.slug} -> ${cover.url}`);
  }

  const removed = await prisma.download.deleteMany({
    where: { fileUrl: { in: brokenDownloadUrls } },
  });
  console.log(`🗑️  Descargables placeholder eliminados: ${removed.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
