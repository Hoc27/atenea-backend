import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/security";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (
    process.env.ADMIN_EMAIL ?? "admin@institutoatenea.edu.pa"
  ).toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "CambiarEstaClave_123!";
  const name = process.env.ADMIN_NAME ?? "Administrador";

  const passwordHash = await hashPassword(password);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: { name },
    create: { email, name, passwordHash },
  });

  console.log(`Admin listo: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
