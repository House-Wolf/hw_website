/**
 * Script to verify and fix division slugs in the database
 * Safe to run on production - only updates if mismatches are found
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Expected divisions matching divisionConfig.ts
const EXPECTED_DIVISIONS = [
  {
    name: "TACOPS",
    slug: "tacops",
    description: "Tactical Air Control Operations Division",
    sortOrder: 1,
  },
  {
    name: "ARCOPS",
    slug: "arcops",
    description: "Advanced Research & Cartography Operations Division",
    sortOrder: 2,
  },
  {
    name: "SPECOPS",
    slug: "specops",
    description: "Special Operations Division",
    sortOrder: 3,
  },
  {
    name: "LOCOPS",
    slug: "locops",
    description: "Logistics and Command Operations Division",
    sortOrder: 4,
  },
];

async function verifyDivisionSlugs(dryRun = true) {
  console.log("🔍 Checking division slugs...\n");
  console.log(`Mode: ${dryRun ? "DRY RUN (no changes will be made)" : "LIVE (will update database)"}\n`);

  try {
    const divisions = await prisma.division.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: {
          select: {
            mercenaryProfiles: true,
          },
        },
      },
    });

    console.log(`📊 Found ${divisions.length} divisions in database\n`);

    const issues: Array<{
      current: any;
      expected: any;
      action: string;
    }> = [];

    // Check for wrong slug: arccops -> arcops
    const arccops = divisions.find((d) => d.slug === "arccops");
    if (arccops) {
      issues.push({
        current: arccops,
        expected: EXPECTED_DIVISIONS.find((d) => d.slug === "arcops"),
        action: "UPDATE_SLUG",
      });
      console.log("❌ Found incorrect slug: 'arccops' should be 'arcops'");
      console.log(`   Division has ${arccops._count.mercenaryProfiles} member profiles\n`);
    }

    // Check if correct divisions exist
    for (const expected of EXPECTED_DIVISIONS) {
      const found = divisions.find((d) => d.slug === expected.slug);
      if (!found) {
        issues.push({
          current: null,
          expected,
          action: "CREATE",
        });
        console.log(`⚠️  Missing division: '${expected.slug}' (${expected.name})\n`);
      } else {
        console.log(`✅ ${expected.slug.toUpperCase()}: ${found.name}`);
        console.log(`   Slug: ${found.slug}`);
        console.log(`   Active: ${found.isActive}`);
        console.log(`   Profiles: ${found._count.mercenaryProfiles}\n`);
      }
    }

    if (issues.length === 0) {
      console.log("\n✅ All division slugs are correct!");
      return;
    }

    console.log(`\n⚠️  Found ${issues.length} issue(s) to fix\n`);

    if (dryRun) {
      console.log("🔒 DRY RUN MODE - No changes made");
      console.log("Run with --fix flag to apply changes: npx tsx scripts/verify-division-slugs.ts --fix\n");
      return;
    }

    // Apply fixes
    console.log("🔧 Applying fixes...\n");

    for (const issue of issues) {
      if (issue.action === "UPDATE_SLUG" && issue.current) {
        console.log(`Updating slug from '${issue.current.slug}' to '${issue.expected.slug}'...`);
        await prisma.division.update({
          where: { id: issue.current.id },
          data: {
            slug: issue.expected.slug,
            name: issue.expected.name,
          },
        });
        console.log("✅ Updated successfully\n");
      } else if (issue.action === "CREATE") {
        console.log(`Creating division: ${issue.expected.name} (${issue.expected.slug})...`);
        await prisma.division.create({
          data: {
            name: issue.expected.name,
            slug: issue.expected.slug,
            description: issue.expected.description,
            isActive: true,
            sortOrder: issue.expected.sortOrder,
          },
        });
        console.log("✅ Created successfully\n");
      }
    }

    console.log("✅ All fixes applied successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes("--fix");

verifyDivisionSlugs(!shouldFix);
