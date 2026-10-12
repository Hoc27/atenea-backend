import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { readdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const prisma = new PrismaClient();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const THRESHOLD = 1024 * 1024; // 1 MB

async function main(): Promise<void> {
  const files = await readdir(UPLOAD_DIR);
  let converted = 0;
  let before = 0;
  let after = 0;

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) continue;

    const full = path.join(UPLOAD_DIR, f);
    const original = await stat(full);
    if (original.size <= THRESHOLD) continue;

    const base = path.basename(f, ext);
    const outName = `${base}.webp`;
    const tmp = path.join(UPLOAD_DIR, `${base}.conv.tmp`);

    await sharp(full).rotate().webp({ quality: 90 }).toFile(tmp);

    const newUrl = `/uploads/${outName}`;
    await prisma.media.updateMany({
      where: { url: `/uploads/${f}` },
      data: { url: newUrl },
    });
    await prisma.download.updateMany({
      where: { fileUrl: `/uploads/${f}` },
      data: { fileUrl: newUrl },
    });

    await unlink(full);
    await rename(tmp, path.join(UPLOAD_DIR, outName));

    const convertedStat = await stat(path.join(UPLOAD_DIR, outName));
    before += original.size;
    after += convertedStat.size;
    converted++;

    console.log(
      `${f} -> ${outName}  (${(original.size / 1024 / 1024).toFixed(2)}MB -> ${(
        convertedStat.size /
        1024 /
        1024
      ).toFixed(2)}MB)`
    );
  }

  console.log(
    `\nConvertidas: ${converted}  ·  ${(before / 1024 / 1024).toFixed(1)}MB -> ${(
      after /
      1024 /
      1024
    ).toFixed(1)}MB`
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
