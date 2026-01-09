/**
 * Script to verify subdivision patches are correctly set
 * Run with: npx tsx scripts/verify-subdivision-patches.ts
 */

import { prisma } from "../lib/prisma";

async function verifyPatches() {
  console.log("Verifying subdivision patches...\n");

  try {
    const subdivisions = await prisma.subdivision.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        patchImagePath: true,
        division: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            mercenaryProfiles: true,
          },
        },
      },
      orderBy: {
        division: {
          name: "asc",
        },
      },
    });

    console.log(`Total subdivisions: ${subdivisions.length}\n`);

    let currentDivision = "";
    let withPatches = 0;
    let withoutPatches = 0;

    for (const sub of subdivisions) {
      if (sub.division.name !== currentDivision) {
        currentDivision = sub.division.name;
        console.log(`\n📁 ${currentDivision}`);
      }

      const hasPatch = sub.patchImagePath ? "✓" : "✗";
      const profileCount = sub._count.mercenaryProfiles;

      console.log(`  ${hasPatch} ${sub.name} (${profileCount} profiles)`);
      if (sub.patchImagePath) {
        console.log(`    ${sub.patchImagePath}`);
        withPatches++;
      } else {
        withoutPatches++;
      }
    }

    console.log("\n\n=== Summary ===");
    console.log(`With patches: ${withPatches}`);
    console.log(`Without patches: ${withoutPatches}`);
    console.log(`Total: ${subdivisions.length}`);
  } catch (error) {
    console.error("Error verifying patches:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyPatches();
