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
    coverImage: string | null;
    category: string;
    published: boolean;
    featured: boolean;
    publishedAt: Date | null;
  }> = [
    {
      title: "Feria Familiar: Un Espacio de Encuentro y Aprendizaje",
      slug: "feria-familiar",
      excerpt:
        "El domingo 27 de septiembre, Instituto Atenea abrió sus puertas para la Feria Familiar, un espacio de encuentro y aprendizaje para toda la comunidad.",
      content:
        "El domingo 27 de septiembre, Instituto Atenea abrió sus puertas para la Feria Familiar, un espacio diseñado para que padres, estudiantes y comunidad compartan momentos significativos. Durante toda la jornada, desde las 9:00 AM hasta las 4:30 PM, las familias disfrutaron de actividades interactivas, exposiciones de proyectos estudiantiles y experiencias de aprendizaje vivencial.\n\nEste evento refuerza nuestro compromiso con la educación integral, donde la familia es parte fundamental del proceso formativo. Fue una oportunidad para celebrar los logros alcanzados y fortalecer el vínculo entre la institución y la comunidad que la respalda.",
      coverImage: "/images/noticias/feria-familiar-01.jpg",
      category: "Comunidad",
      published: true,
      featured: true,
      publishedAt: new Date("2026-09-27T12:00:00Z"),
    },
    {
      title: "Festival Folklórico 2026: Celebrando Nuestras Raíces",
      slug: "festival-folklorico-2026",
      excerpt:
        "El viernes 21 de agosto, Instituto Atenea conmemoró sus tradiciones con música, danzas y el color de nuestra identidad panameña.",
      content:
        "El viernes 21 de agosto, Instituto Atenea conmemoró sus tradiciones con el Festival Folklórico 2026, una celebración llena de color, música y danzas que reflejan la riqueza cultural de nuestro país.\n\nNuestros estudiantes se convirtieron en embajadores de nuestra identidad, presentando números artísticos que honran el patrimonio panameño. Este festival trasciende lo meramente artístico: es una herramienta pedagógica que conecta a nuestros alumnos con su historia y les enseña a valorar la diversidad cultural. Fue un día de orgullo institucional donde cada presentación llevaba consigo la dedicación y el aprendizaje de meses de preparación.",
      coverImage: "/images/noticias/festival-folklorico-01.jpg",
      category: "Cultura",
      published: true,
      featured: false,
      publishedAt: new Date("2026-08-21T12:00:00Z"),
    },
    {
      title: "Presentación de Bellas Artes y Recital 2026: El Arte como Expresión",
      slug: "bellas-artes-recital-2026",
      excerpt:
        "En julio de 2026, Instituto Atenea presentó su muestra de Bellas Artes y Recital, celebrando el talento artístico de sus estudiantes.",
      content:
        "En julio de 2026, Instituto Atenea presentó su tradicional muestra de Bellas Artes y Recital, un evento que celebra el talento artístico de nuestros estudiantes en música, danza, teatro y artes visuales.\n\nEsta presentación es el resultado de un proceso pedagógico integral donde nuestros alumnos desarrollan confianza, creatividad y disciplina. Cada número reflejó horas de trabajo colaborativo, mentoría de docentes especializados y el compromiso de nuestros estudiantes con la excelencia. El recital demostró que en Instituto Atenea, el arte no es solo una asignatura, sino una herramienta transformadora que enriquece la formación de nuestros jóvenes.",
      coverImage: "/images/noticias/festival-de-arte-01.jpg",
      category: "Arte",
      published: true,
      featured: false,
      publishedAt: new Date("2026-07-15T12:00:00Z"),
    },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        category: post.category,
        published: post.published,
        featured: post.featured,
        publishedAt: post.publishedAt,
      },
      create: post,
    });
  }

  // Elimina posts que ya no forman parte del seed (placeholders/datos de prueba).
  const slugs = posts.map((p) => p.slug);
  const removed = await prisma.post.deleteMany({
    where: { slug: { notIn: slugs } },
  });

  console.log(`Posts listos: ${posts.length} (eliminados: ${removed.count})`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await seedContentBlocks();
  await seedDownloads();
  await seedPosts();
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
