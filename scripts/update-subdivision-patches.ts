/**
 * Script to update existing subdivisions with patch image paths
 * Run with: npx tsx scripts/update-subdivision-patches.ts
 */

import { prisma } from "../lib/prisma";
import { SUBDIVISION_PATCHES } from "../lib/subdivisions/subdivisionConfig";

async function updateSubdivisionPatches() {
  console.log("Starting subdivision patch update...\n");

  try {
    // Get all subdivisions from the database
    const subdivisions = await prisma.subdivision.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        patchImagePath: true,
      },
    });

    console.log(`Found ${subdivisions.length} subdivisions in database\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const subdivision of subdivisions) {
      const normalizedSlug = subdivision.slug.toLowerCase().trim();
      const patchConfig = SUBDIVISION_PATCHES[normalizedSlug];

      if (patchConfig) {
        // Update the subdivision with the patch path
        await prisma.subdivision.update({
          where: { id: subdivision.id },
          data: { patchImagePath: patchConfig.patchImagePath },
        });

        console.log(`✓ Updated: ${subdivision.name} (${subdivision.slug})`);
        console.log(`  Path: ${patchConfig.patchImagePath}\n`);
        updatedCount++;
      } else {
        console.log(`⚠ Skipped: ${subdivision.name} (${subdivision.slug}) - No patch config found\n`);
        skippedCount++;
      }
    }

    console.log("\n=== Summary ===");
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Total: ${subdivisions.length}`);
    console.log("\nDone!");
  } catch (error) {
    console.error("Error updating subdivision patches:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateSubdivisionPatches();
