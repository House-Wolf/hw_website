import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedDivisions() {
  console.log("🌱 Seeding divisions...");

  const divisions = [
    {
      name: "TACOPS",
      slug: "tacops",
      description: "Tactical Air Control Operations Division",
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "ARCOPS",
      slug: "arcops",
      description: "Advanced Research & Cartography Operations Division",
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "SPECOPS",
      slug: "specops",
      description: "Special Operations Division",
      isActive: true,
      sortOrder: 3,
    },
    {
      name: "LOCOPS",
      slug: "locops",
      description: "Logistics and Command Operations Division",
      isActive: true,
      sortOrder: 4,
    },
  ];

  for (const division of divisions) {
    const existing = await prisma.division.findUnique({
      where: { slug: division.slug },
    });

    if (existing) {
      console.log(`✓ Division "${division.name}" already exists`);
    } else {
      await prisma.division.create({
        data: division,
      });
      console.log(`✓ Created division "${division.name}"`);
    }
  }

  console.log("✅ Divisions seeded successfully!");
}

seedDivisions()
  .catch((error) => {
    console.error("❌ Error seeding divisions:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
