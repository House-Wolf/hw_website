import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedRanks() {
  console.log("🌱 Seeding ranks...");

  const ranks = [
    // Leadership Core (sortOrder 1-3)
    {
      name: "Clan Warlord",
      slug: "clan-warlord",
      sortOrder: 1,
      isLeadershipCore: true,
      isOfficerCore: false,
    },
    {
      name: "Hand of the Clan",
      slug: "hand-of-the-clan",
      sortOrder: 2,
      isLeadershipCore: true,
      isOfficerCore: false,
    },
    {
      name: "High Councilor",
      slug: "high-councilor",
      sortOrder: 3,
      isLeadershipCore: true,
      isOfficerCore: false,
    },

    // Officers (sortOrder 10-40)
    {
      name: "Armor",
      slug: "armor",
      sortOrder: 10,
      isLeadershipCore: false,
      isOfficerCore: true,
    },
    {
      name: "Fleet Commander",
      slug: "fleet-commander",
      sortOrder: 11,
      isLeadershipCore: false,
      isOfficerCore: true,
    },
    {
      name: "Captain",
      slug: "captain",
      sortOrder: 20,
      isLeadershipCore: false,
      isOfficerCore: true,
    },
    {
      name: "Lieutenant",
      slug: "lieutenant",
      sortOrder: 30,
      isLeadershipCore: false,
      isOfficerCore: true,
    },

    // Non-Commissioned Officers (sortOrder 50-80)
    {
      name: "Field Marshal",
      slug: "field-marshal",
      sortOrder: 50,
      isLeadershipCore: false,
      isOfficerCore: false,
    },
    {
      name: "Platoon Sergeant",
      slug: "platoon-sergeant",
      sortOrder: 60,
      isLeadershipCore: false,
      isOfficerCore: false,
    },
    {
      name: "Rally Master",
      slug: "rally-master",
      sortOrder: 70,
      isLeadershipCore: false,
      isOfficerCore: false,
    },

    // Enlisted (sortOrder 100+)
    {
      name: "Wolf Dragoon",
      slug: "wolf-dragoon",
      sortOrder: 100,
      isLeadershipCore: false,
      isOfficerCore: false,
    },
    {
      name: "Foundling",
      slug: "foundling",
      sortOrder: 200,
      isLeadershipCore: false,
      isOfficerCore: false,
    },
    {
      name: "Member",
      slug: "member",
      sortOrder: 999,
      isLeadershipCore: false,
      isOfficerCore: false,
    },
  ];

  for (const rank of ranks) {
    const existing = await prisma.rank.findUnique({
      where: { slug: rank.slug },
    });

    if (existing) {
      // Update existing rank to ensure flags are correct
      await prisma.rank.update({
        where: { slug: rank.slug },
        data: {
          name: rank.name,
          sortOrder: rank.sortOrder,
          isLeadershipCore: rank.isLeadershipCore,
          isOfficerCore: rank.isOfficerCore,
        },
      });
      console.log(`✓ Updated rank "${rank.name}"`);
    } else {
      await prisma.rank.create({
        data: rank,
      });
      console.log(`✓ Created rank "${rank.name}"`);
    }
  }

  console.log("✅ Ranks seeded successfully!");
}

seedRanks()
  .catch((error) => {
    console.error("❌ Error seeding ranks:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
