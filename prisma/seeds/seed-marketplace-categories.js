const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed Marketplace Categories aligned with SRP Tool
 * This script ensures the correct categories exist for the SRP calculator
 */

const CORRECT_CATEGORIES = [
  {
    name: 'Weapons',
    slug: 'weapons',
    description: 'Personal weapons including pistols, rifles, SMGs, and more',
    sortOrder: 1,
  },
  {
    name: 'Armor',
    slug: 'armor',
    description: 'Personal armor, helmets, and protective gear',
    sortOrder: 2,
  },
  {
    name: 'Components',
    slug: 'components',
    description: 'Ship components including coolers, power plants, shields, and quantum drives',
    sortOrder: 3,
  },
  {
    name: 'Ship Weapons',
    slug: 'ship-weapons',
    description: 'Ship-mounted weapons and ordnance',
    sortOrder: 4,
  },
];

async function main() {
  console.log('\n=== Seeding Marketplace Categories ===\n');

  // Check if there are existing listings
  const listingCount = await prisma.marketplaceListings.count();
  console.log(`Found ${listingCount} existing listings in the database.\n`);

  // Deactivate old categories (Vehicles, Ships)
  const oldCategories = await prisma.marketplaceCategory.findMany({
    where: {
      slug: {
        in: ['vehicles', 'ships']
      }
    }
  });

  if (oldCategories.length > 0) {
    console.log('Deactivating old categories (Vehicles, Ships)...');
    await prisma.marketplaceCategory.updateMany({
      where: {
        slug: {
          in: ['vehicles', 'ships']
        }
      },
      data: {
        isActive: false,
      }
    });
    console.log(`Deactivated ${oldCategories.length} old categories.\n`);
  }

  // Create or update the correct categories
  console.log('Creating/updating SRP-aligned categories...\n');

  for (const category of CORRECT_CATEGORIES) {
    const result = await prisma.marketplaceCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        isActive: true,
        sortOrder: category.sortOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        isActive: true,
        sortOrder: category.sortOrder,
      },
    });

    console.log(`✓ ${result.name} (ID: ${result.id}, Slug: ${result.slug})`);
  }

  console.log('\n=== Final Categories ===\n');

  const allCategories = await prisma.marketplaceCategory.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  allCategories.forEach(cat => {
    const status = cat.isActive ? '✓ ACTIVE' : '✗ INACTIVE';
    console.log(`${status} | ID: ${cat.id} | ${cat.name} (${cat.slug})`);
  });

  console.log(`\nTotal: ${allCategories.length} categories\n`);

  if (listingCount > 0) {
    console.log('⚠️  WARNING: You have existing listings that may need to be recategorized.');
    console.log('   Please update them through the marketplace dashboard.\n');
  }
}

main()
  .catch(e => {
    console.error('Error seeding categories:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
