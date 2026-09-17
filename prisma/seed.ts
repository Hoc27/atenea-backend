import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/security";

const prisma = new PrismaClient();

async function seedAdmin(): Promise<void> {
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

async function seedContentBlocks(): Promise<void> {
  const blocks: Array<{ key: string; value: string }> = [
    { key: "home.hero.title", value: "Bienvenido al Instituto Atenea" },
    {
      key: "home.hero.subtitle",
      value: "Formando líderes con excelencia académica y valores.",
    },
    {
      key: "home.about",
      value:
        "El Instituto Atenea ofrece educación integral desde preescolar hasta bachillerato.",
    },
    { key: "contact.email", value: "info@institutoatenea.edu.pa" },
    { key: "contact.phone", value: "+507 000-0000" },
    { key: "contact.address", value: "Ciudad de Panamá, Panamá" },
  ];

  for (const block of blocks) {
    await prisma.contentBlock.upsert({
      where: { key: block.key },
      update: { value: block.value },
      create: block,
    });
  }

  console.log(`ContentBlocks listos: ${blocks.length}`);
}

async function seedDownloads(): Promise<void> {
  const categories: Array<{ name: string; slug: string }> = [
    { name: "Admisiones", slug: "admisiones" },
    { name: "Reglamentos", slug: "reglamentos" },
    { name: "Calendarios", slug: "calendarios" },
  ];

  const categoryBySlug = new Map<string, string>();
  for (const cat of categories) {
    const record = await prisma.downloadCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: cat,
    });
    categoryBySlug.set(cat.slug, record.id);
  }

  const downloads: Array<{
    slugKey: string;
    title: string;
    description: string;
    categorySlug: string;
    order: number;
  }> = [
    {
      slugKey: "formulario-admision",
      title: "Formulario de Admisión 2026",
      description: "Documento PDF con el formulario de inscripción.",
      categorySlug: "admisiones",
      order: 1,
    },
    {
      slugKey: "reglamento-interno",
      title: "Reglamento Interno del Estudiante",
      description: "Normas de convivencia y disciplina.",
      categorySlug: "reglamentos",
      order: 1,
    },
    {
      slugKey: "calendario-escolar",
      title: "Calendario Escolar 2026",
      description: "Fechas importantes del año lectivo.",
      categorySlug: "calendarios",
      order: 1,
    },
  ];

  for (const d of downloads) {
    const fileName = `${d.slugKey}.pdf`;
    const existing = await prisma.download.findFirst({
      where: { fileName },
    });
    const data = {
      title: d.title,
      description: d.description,
      fileUrl: `/uploads/${fileName}`,
      fileName,
      mimeType: "application/pdf",
      size: 102400,
      categoryId: categoryBySlug.get(d.categorySlug) ?? null,
      order: d.order,
      published: true,
    };

    if (existing) {
      await prisma.download.update({ where: { id: existing.id }, data });
    } else {
      await prisma.download.create({ data });
    }
  }

  console.log(
    `DownloadCategories listas: ${categories.length}, Downloads: ${downloads.length}`
  );
}

async function seedPosts(): Promise<void> {
  const posts: Array<{
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    category: string;
    published: boolean;
    featured: boolean;
    publishedAt: Date | null;
  }> = [
    {
      title: "Inicio del año lectivo 2026",
      slug: "inicio-ano-lectivo-2026",
      excerpt: "Damos la bienvenida a todos nuestros estudiantes.",
      content:
        "El Instituto Atenea inicia el año lectivo 2026 con nuevas instalaciones y programas académicos renovados.",
      category: "Noticias",
      published: true,
      featured: true,
      publishedAt: new Date("2026-01-15T09:00:00Z"),
    },
    {
      title: "Feria de Ciencias 2026",
      slug: "feria-de-ciencias-2026",
      excerpt: "Nuestros estudiantes presentan proyectos innovadores.",
      content:
        "La feria de ciencias reunió a estudiantes de todos los niveles con proyectos sobre energía renovable y robótica.",
      category: "Eventos",
      published: true,
      featured: false,
      publishedAt: new Date("2026-03-10T14:00:00Z"),
    },
    {
      title: "Proceso de admisión abierto",
      slug: "proceso-de-admision-abierto",
      excerpt: "Ya puedes inscribir a tus hijos para el próximo periodo.",
      content:
        "El proceso de admisión para el periodo 2026-2027 ya se encuentra abierto. Consulta los requisitos en la sección de descargas.",
      category: "Admisiones",
      published: false,
      featured: false,
      publishedAt: null,
    },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        published: post.published,
        featured: post.featured,
        publishedAt: post.publishedAt,
      },
      create: post,
    });
  }

  console.log(`Posts listos: ${posts.length}`);
}

async function seedMedia(): Promise<void> {
  const items: Array<{ url: string; alt: string; area: string; order: number }> =
    [
      {
        url: "/images/homepage/hero.jpg",
        alt: "Fachada del Instituto Atenea",
        area: "homepage",
        order: 1,
      },
      {
        url: "/images/galeria/aula.jpg",
        alt: "Estudiantes en el aula",
        area: "galeria",
        order: 1,
      },
      {
        url: "/images/galeria/laboratorio.jpg",
        alt: "Laboratorio de ciencias",
        area: "galeria",
        order: 2,
      },
    ];

  for (const item of items) {
    const existing = await prisma.media.findFirst({ where: { url: item.url } });
    if (existing) {
      await prisma.media.update({ where: { id: existing.id }, data: item });
    } else {
      await prisma.media.create({ data: item });
    }
  }

  console.log(`Media listo: ${items.length}`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedContentBlocks();
  await seedDownloads();
  await seedPosts();
  await seedMedia();
  console.log("Seed completado.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
