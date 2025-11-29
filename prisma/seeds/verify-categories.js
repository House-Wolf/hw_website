const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Verification script for marketplace categories
 * Run this to confirm categories are correctly configured for the SRP calculator
 */

const EXPECTED_CATEGORIES = [
  { name: 'Weapons', slug: 'weapons', srpType: 'Guns', fbv: 2500 },
  { name: 'Armor', slug: 'armor', srpType: 'Armor', fbv: 10000 },
  { name: 'Components', slug: 'components', srpType: 'Components', fbv: 25000 },
  { name: 'Ship Weapons', slug: 'ship-weapons', srpType: 'Ship Weapons', fbv: 35000 },
];

async function verify() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Marketplace Categories Verification          ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Fetch active categories
  const activeCategories = await prisma.marketplaceCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  let allGood = true;

  // Check count
  if (activeCategories.length !== 4) {
    console.log(`❌ Expected 4 active categories, found ${activeCategories.length}\n`);
    allGood = false;
  } else {
    console.log(`✓ Found 4 active categories\n`);
  }

  // Check each expected category
  console.log('Category Details:\n');
  for (const expected of EXPECTED_CATEGORIES) {
    const found = activeCategories.find(c => c.slug === expected.slug);

    if (!found) {
      console.log(`❌ Missing: ${expected.name} (${expected.slug})`);
      allGood = false;
    } else if (found.name !== expected.name) {
      console.log(`❌ Name mismatch for ${expected.slug}: expected "${expected.name}", got "${found.name}"`);
      allGood = false;
    } else {
      console.log(`✓ ${found.name}`);
      console.log(`  ID: ${found.id}`);
      console.log(`  Slug: ${found.slug}`);
      console.log(`  SRP Type: ${expected.srpType}`);
      console.log(`  FBV: ${expected.fbv.toLocaleString()} aUEC\n`);
    }
  }

  // Check for inactive categories
  const inactiveCategories = await prisma.marketplaceCategory.findMany({
    where: { isActive: false },
  });

  if (inactiveCategories.length > 0) {
    console.log('Inactive Categories (these are OK, just FYI):');
    inactiveCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.slug})`);
    });
    console.log('');
  }

  // Check for listings using old categories
  const listingsWithOldCategories = await prisma.marketplaceListings.count({
    where: {
      category: {
        isActive: false,
      }
    }
  });

  if (listingsWithOldCategories > 0) {
    console.log(`⚠️  Warning: ${listingsWithOldCategories} listing(s) using inactive categories`);
    console.log('   These should be updated to use the new categories.\n');
  }

  // Final verdict
  console.log('═══════════════════════════════════════════════\n');
  if (allGood) {
    console.log('✅ All categories are correctly configured!\n');
    console.log('The SRP calculator should work properly.\n');
  } else {
    console.log('❌ Category configuration has issues.\n');
    console.log('Run the seed script to fix:\n');
    console.log('  node prisma/seeds/seed-marketplace-categories.js\n');
  }
}

verify()
  .catch(e => {
    console.error('Error during verification:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
