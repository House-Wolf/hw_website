import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n📋 Division Rosters:\n');

  const divisions = await prisma.division.findMany({
    where: {
      slug: { in: ['arcops', 'locops', 'specops', 'tacops', 'house-wolf-command'] }
    },
    include: {
      mercenaryProfiles: {
        where: {
          status: 'APPROVED',
          isPublic: true
        },
        include: {
          user: { select: { discordUsername: true } },
          rank: { select: { name: true } }
        },
        orderBy: { characterName: 'asc' }
      }
    },
    orderBy: { slug: 'asc' }
  });

  divisions.forEach(div => {
    console.log(`\n${div.name.toUpperCase()} (${div.slug}):`);
    console.log(`  Total profiles: ${div.mercenaryProfiles.length}`);

    if (div.mercenaryProfiles.length === 0) {
      console.log('  ❌ NO PROFILES');
    } else {
      div.mercenaryProfiles.forEach((p, i) => {
        const portrait = p.portraitUrl ? '✅' : '❌';
        console.log(`  ${i + 1}. ${portrait} ${p.characterName} (${p.user.discordUsername})`);
      });
    }
  });

  console.log('\n');
}

main().finally(() => prisma.$disconnect());
