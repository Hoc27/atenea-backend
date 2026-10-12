import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const SRC_ROOT = path.resolve(process.cwd(), "../t-frontend/public/images/noticias");

const events = [
  { slug: "feria-familiar", folder: "feria-familiar", name: "Feria Familiar" },
  { slug: "festival-folklorico-2026", folder: "festival-folklorico", name: "Festival Folklórico 2026" },
  {
    slug: "bellas-artes-recital-2026",
    folder: "festival-de-arte",
    name: "Presentación de Bellas Artes y Recital 2026",
  },
];

async function main(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  for (const ev of events) {
    const dir = path.join(SRC_ROOT, ev.folder);
    const files = (await readdir(dir))
      .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .sort();

    let coverUrl: string | null = null;

    for (let i = 0; i < files.length; i++) {
      const ext = path.extname(files[i]).toLowerCase();
      const name = `${randomUUID()}${ext}`;
      await copyFile(path.join(dir, files[i]), path.join(UPLOAD_DIR, name));

      const media = await prisma.media.create({
        data: {
          url: `/uploads/${name}`,
          alt: `${ev.name} — foto ${i + 1}`,
          area: ev.folder,
        },
      });

      if (i === 0) coverUrl = media.url;
    }

    await prisma.post.update({
      where: { slug: ev.slug },
      data: { coverImage: coverUrl },
    });

    console.log(`${ev.folder}: ${files.length} imágenes → cover ${coverUrl}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
