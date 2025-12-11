/**
 * Division Data Verification Script
 *
 * This script verifies that all required divisions exist in the database
 * and creates them if they're missing.
 *
 * Run with: npx tsx scripts/verify-divisions.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REQUIRED_DIVISIONS = [
  {
    name: 'House Wolf Command',
    slug: 'leadership',
    description: 'The elite command structure of House Wolf',
    isActive: true,
    sortOrder: 0,
  },
  {
    name: 'Tactical Air Control Operations Division',
    slug: 'tacops',
    description: 'TACOPS - Frontline air control and tactical operations',
    isActive: true,
    sortOrder: 1,
  },
  {
    name: 'Special Operations Division',
    slug: 'specops',
    description: 'SPECOPS - Elite special operations and medical support',
    isActive: true,
    sortOrder: 2,
  },
  {
    name: 'Logistics and Command Operations Division',
    slug: 'locops',
    description: 'LOCOPS - Logistics, mining, salvage, and supply operations',
    isActive: true,
    sortOrder: 3,
  },
  {
    name: 'Advanced Research and Cartography Operations',
    slug: 'arccops',
    description: 'ARCCOPS - Reconnaissance, research, and cartography',
    isActive: true,
    sortOrder: 4,
  },
];

async function verifyDivisions() {
  console.log('🔍 Verifying division data...\n');

  try {
    // Fetch all existing divisions
    const existingDivisions = await prisma.division.findMany({
      select: { slug: true, name: true, isActive: true }
    });

    console.log(`Found ${existingDivisions.length} existing divisions:`);
    existingDivisions.forEach(div => {
      console.log(`  ✓ ${div.slug} - ${div.name} (${div.isActive ? 'active' : 'inactive'})`);
    });
    console.log('');

    // Check for missing divisions
    const existingSlugs = new Set(existingDivisions.map(d => d.slug));
    const missingDivisions = REQUIRED_DIVISIONS.filter(d => !existingSlugs.has(d.slug));

    if (missingDivisions.length === 0) {
      console.log('✅ All required divisions exist!\n');
      return;
    }

    console.log(`⚠️  Missing ${missingDivisions.length} divisions:\n`);
    missingDivisions.forEach(div => {
      console.log(`  ✗ ${div.slug} - ${div.name}`);
    });
    console.log('');

    // Prompt for creation
    console.log('Creating missing divisions...\n');

    for (const division of missingDivisions) {
      try {
        const created = await prisma.division.create({
          data: division
        });
        console.log(`  ✓ Created: ${created.slug} - ${created.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to create ${division.slug}:`, error);
      }
    }

    console.log('\n✅ Division verification complete!\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyDivisions()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
