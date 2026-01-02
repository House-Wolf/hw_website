// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// SRP categories (must stay strict)
const SRP_CATEGORIES = [
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

// Marketplace-only categories
const MARKETPLACE_ONLY = [
  {
    name: 'Clothing',
    slug: 'clothing',
    description: 'Apparel, undersuits, outfits, and cosmetic gear',
    sortOrder: 5,
  },
  {
    name: 'Items',
    slug: 'items',
    description: 'Misc items, consumables, gadgets, and general equipment',
    sortOrder: 6,
  },
  {
    name: 'Services',
    slug: 'services',
    description: 'Hauling, escorting, logistics, medical assistance, and other player services',
    sortOrder: 7,
  },
  {
    name: 'Rentals',
    slug: 'rentals',
    description: 'Ship rentals, equipment rentals, temporary contracts',
    sortOrder: 8,
  },
];

const ALL_CATEGORIES = [...SRP_CATEGORIES, ...MARKETPLACE_ONLY];

async function main() {
  console.log('\n=== Seeding Marketplace Categories ===\n');

  // Deactivate old, unused categories
  await prisma.marketplaceCategory.updateMany({
    where: { slug: { in: ['vehicles', 'ships'] } },
    data: { isActive: false },
  });

  // Upsert all category definitions
  for (const category of ALL_CATEGORIES) {
    const result = await prisma.marketplaceCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });

    console.log(`✓ ${result.name} (${result.slug})`);
  }

  console.log('\n=== Final Categories in Database ===\n');

  const categories = await prisma.marketplaceCategory.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  for (const cat of categories) {
    const group = SRP_CATEGORIES.find(c => c.slug === cat.slug) ? '[SRP]' : '[Marketplace]';
    console.log(`${group} ${cat.sortOrder}. ${cat.name} (${cat.slug})`);
  }
}

main()
  .catch(err => console.error('Error seeding categories:', err))
  .finally(() => prisma.$disconnect());
