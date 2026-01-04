import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking division slugs in database...\n');

  const divisions = await prisma.division.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          mercenaryProfiles: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log('Found divisions:');
  divisions.forEach(div => {
    console.log(`  - ${div.name}`);
    console.log(`    Slug: "${div.slug}"`);
    console.log(`    Profiles: ${div._count.mercenaryProfiles}`);
    console.log();
  });

  console.log('Expected slugs from config: arcops, locops, specops, tacops\n');
}

main().finally(() => prisma.$disconnect());
