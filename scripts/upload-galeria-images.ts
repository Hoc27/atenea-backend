import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readdir } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const SRC_DIR = path.resolve(process.cwd(), "../t-frontend/public/images/galeria");

async function main(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const files = (await readdir(SRC_DIR))
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f) && !f.includes("copia"))
    .sort();

  let order = 1;
  for (let i = 0; i < files.length; i++) {
    const ext = path.extname(files[i]).toLowerCase();
    const name = `${randomUUID()}${ext}`;
    await copyFile(path.join(SRC_DIR, files[i]), path.join(UPLOAD_DIR, name));
    await prisma.media.create({
      data: {
        url: `/uploads/${name}`,
        alt: `Instituto Atenea — foto ${i + 1}`,
        area: "Galería",
        order: order++,
      },
    });
  }

  // Elimina los registros placeholder del seed (URLs que no son /uploads/).
  const removed = await prisma.media.deleteMany({
    where: { NOT: { url: { startsWith: "/uploads/" } } },
  });

  console.log(
    `Galería: ${files.length} imágenes migradas. Placeholders eliminados: ${removed.count}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
