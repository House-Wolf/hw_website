import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Searching for zombierecon profiles...\n');

  const profiles = await prisma.mercenaryProfile.findMany({
    where: {
      OR: [
        { characterName: { contains: 'zombie', mode: 'insensitive' } },
        { user: { discordUsername: { contains: 'zombie', mode: 'insensitive' } } }
      ]
    },
    include: {
      user: true,
      division: true,
      subdivision: true,
      rank: true
    }
  });

  if (profiles.length === 0) {
    console.log('❌ No profiles found\n');
    return;
  }

  console.log(`Found ${profiles.length} profile(s):\n`);

  profiles.forEach((profile, i) => {
    console.log(`Profile ${i + 1}:`);
    console.log(`  Character Name: ${profile.characterName}`);
    console.log(`  User: ${profile.user.discordUsername}`);
    console.log(`  Division: ${profile.division.name} (${profile.division.slug})`);
    console.log(`  Subdivision: ${profile.subdivision?.name || 'None'}`);
    console.log(`  Rank: ${profile.rank?.name || 'None'}`);
    console.log(`  Status: ${profile.status}`);
    console.log(`  IsPublic: ${profile.isPublic}`);
    console.log(`  Portrait: ${profile.portraitUrl ? 'Yes ✅' : 'No ❌'}`);
    console.log(`  Created: ${profile.createdAt.toISOString().split('T')[0]}`);
    console.log();
  });
}

main().finally(() => prisma.$disconnect());
