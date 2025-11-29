const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Only SRP categories should be validated
const SRP_SLUGS = ['weapons', 'armor', 'components', 'ship-weapons'];

const EXPECTED_SRP = [
  { slug: 'weapons', name: 'Weapons', srpType: 'Guns', fbv: 2500 },
  { slug: 'armor', name: 'Armor', srpType: 'Armor', fbv: 10000 },
  { slug: 'components', name: 'Components', srpType: 'Components', fbv: 25000 },
  { slug: 'ship-weapons', name: 'Ship Weapons', srpType: 'Ship Weapons', fbv: 35000 },
];

async function verify() {
  console.log('\n=== Marketplace Category Verification ===\n');

  const activeCategories = await prisma.marketplaceCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  });

  let allGood = true;

  // Filter SRP categories by slug
  const activeSrp = activeCategories.filter(cat =>
    SRP_SLUGS.includes(cat.slug)
  );

  // Verify correct SRP category count
  if (activeSrp.length !== SRP_SLUGS.length) {
    console.log(`❌ Expected 4 SRP categories, found ${activeSrp.length}`);
    allGood = false;
  } else {
    console.log(`✓ Found 4 SRP categories active`);
  }

  console.log('\nChecking SRP Categories:\n');

  for (const expected of EXPECTED_SRP) {
    const found = activeSrp.find(c => c.slug === expected.slug);

    if (!found) {
      console.log(`❌ Missing SRP category: ${expected.slug}`);
      allGood = false;
      continue;
    }

    console.log(`✓ ${found.name}`);
    console.log(`  Slug: ${found.slug}`);
    console.log(`  SRP Type: ${expected.srpType}`);
    console.log(`  Base FBV: ${expected.fbv.toLocaleString()} aUEC\n`);
  }

  console.log('\n=== Marketplace-Only Categories ===\n');

  const marketplaceOnly = activeCategories.filter(
    cat => !SRP_SLUGS.includes(cat.slug)
  );

  marketplaceOnly.forEach(cat => {
    console.log(`- ${cat.name} (${cat.slug})`);
  });

  console.log('\n=== Checking Listings for Deprecated Categories ===\n');

  const oldListingCount = await prisma.marketplaceListings.count({
    where: {
      category: { isActive: false }
    }
  });

  if (oldListingCount > 0) {
    console.log(`⚠️  WARNING: ${oldListingCount} listing(s) use inactive categories`);
    console.log('    Please update them from the dashboard.\n');
  } else {
    console.log('✓ No listings are using inactive categories.\n');
  }

  console.log('=== Verification Complete ===\n');

  if (allGood) {
    console.log('✅ All SRP categories are correctly configured!');
  } else {
    console.log('❌ Problems detected — please run the seed script again.');
  }
}

verify()
  .catch(err => console.error('Error during verification:', err))
  .finally(() => prisma.$disconnect());
