/**
 * Script to ensure all subdivisions exist with proper patch paths
 * Run with: npx tsx scripts/seed-subdivisions.ts
 */

import { prisma } from "../lib/prisma";
import { SUBDIVISION_PATCHES } from "../lib/subdivisions/subdivisionConfig";

// Division definitions from the profile page
const DIVISION_DEFINITIONS = [
  {
    name: "House Wolf Command",
    slug: "house-wolf-command",
    subdivisions: ["Leadership Core", "Officers", "Non-Commissioned Officers"],
  },
  {
    name: "TACOPS",
    slug: "tacops",
    subdivisions: ["TACOPS - Command", "TACOPS - Dire Wolfs", "TACOPS - Howlers"],
  },
  {
    name: "SPECOPS",
    slug: "specops",
    subdivisions: [
      "SPECOPS - Command",
      "SPECOPS - Wolfen",
      "SPECOPS - Medic",
      "SPECOPS - Inquisitor",
    ],
  },
  {
    name: "LOCOPS",
    slug: "locops",
    subdivisions: [
      "LOCOPS - Command",
      "LOCOPS - Heavy Lift",
      "LOCOPS - Salvage",
      "LOCOPS - Mining",
      "LOCOPS - Engineer",
    ],
  },
  {
    name: "ARCOPS",
    slug: "arcops",
    subdivisions: [
      "ARCOPS - Command",
      "ARCOPS - Chimeras",
      "ARCOPS - Wayfinders",
      "ARCOPS - Replicators",
    ],
  },
];

function normalizeKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedSubdivisions() {
  console.log("Starting subdivision seed...\n");

  try {
    let createdCount = 0;
    let updatedCount = 0;

    for (const divisionDef of DIVISION_DEFINITIONS) {
      // Ensure division exists
      const division = await prisma.division.upsert({
        where: { slug: divisionDef.slug },
        create: {
          name: divisionDef.name,
          slug: divisionDef.slug,
          description: divisionDef.name,
          isActive: true,
          sortOrder: 0,
        },
        update: {},
      });

      console.log(`\n📁 Division: ${divisionDef.name}`);

      for (const subdivisionName of divisionDef.subdivisions) {
        const subdivisionSlug = normalizeKey(subdivisionName);
        const patchConfig = SUBDIVISION_PATCHES[subdivisionSlug];

        if (!patchConfig) {
          console.log(`  ⚠ No patch config for: ${subdivisionName} (${subdivisionSlug})`);
          continue;
        }

        // Upsert subdivision with patch path
        const subdivision = await prisma.subdivision.upsert({
          where: { slug: subdivisionSlug },
          create: {
            name: subdivisionName,
            slug: subdivisionSlug,
            description: subdivisionName,
            divisionId: division.id,
            patchImagePath: patchConfig.patchImagePath,
            isActive: true,
            sortOrder: 0,
          },
          update: {
            name: subdivisionName,
            divisionId: division.id,
            patchImagePath: patchConfig.patchImagePath,
          },
        });

        if (subdivision) {
          console.log(`  ✓ ${subdivisionName}`);
          console.log(`    Path: ${patchConfig.patchImagePath}`);
          updatedCount++;
        }
      }
    }

    console.log("\n\n=== Summary ===");
    console.log(`Processed: ${updatedCount} subdivisions`);
    console.log("\nDone!");
  } catch (error) {
    console.error("Error seeding subdivisions:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedSubdivisions();
