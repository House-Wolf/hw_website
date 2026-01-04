/**
 * Helper script to check current database state before migration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Current Database State ===\n');

  // Check divisions
  console.log('📁 DIVISIONS:');
  const divisions = await prisma.division.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  divisions.forEach(div => {
    console.log(`  ID: ${div.id} | Slug: ${div.slug.padEnd(10)} | Name: ${div.name}`);
  });

  // Check subdivisions
  console.log('\n📂 SUBDIVISIONS:');
  const subdivisions = await prisma.subdivision.findMany({
    include: { division: true },
    orderBy: { sortOrder: 'asc' }
  });

  if (subdivisions.length === 0) {
    console.log('  (No subdivisions found)');
  } else {
    subdivisions.forEach(sub => {
      console.log(`  ID: ${sub.id} | Slug: ${sub.slug.padEnd(20)} | Name: ${sub.name.padEnd(30)} | Division: ${sub.division.slug}`);
    });
  }

  // Check ranks
  console.log('\n⭐ RANKS:');
  const ranks = await prisma.rank.findMany({
    orderBy: { sortOrder: 'asc' }
  });

  if (ranks.length === 0) {
    console.log('  (No ranks found)');
  } else {
    ranks.forEach(rank => {
      const flags = [];
      if (rank.isLeadershipCore) flags.push('Leadership');
      if (rank.isOfficerCore) flags.push('Officer');
      const flagStr = flags.length > 0 ? `[${flags.join(', ')}]` : '';
      console.log(`  ID: ${rank.id} | Slug: ${rank.slug.padEnd(25)} | Name: ${rank.name.padEnd(30)} ${flagStr}`);
    });
  }

  // Check existing profiles
  console.log('\n👥 EXISTING MERCENARY PROFILES:');
  const profiles = await prisma.mercenaryProfile.findMany({
    include: {
      user: true,
      division: true,
      subdivision: true,
      rank: true,
    }
  });

  if (profiles.length === 0) {
    console.log('  (No profiles found)');
  } else {
    console.log(`  Total: ${profiles.length} profiles`);
    profiles.forEach(p => {
      console.log(`  - ${p.characterName} (${p.user.discordUsername}) | ${p.division.slug} | Status: ${p.status}`);
    });
  }

  console.log('\n=== End of Database State ===');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
