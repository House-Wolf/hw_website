import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.mercenaryProfile.findMany({
    where: { portraitUrl: { not: null } },
    select: {
      characterName: true,
      portraitUrl: true,
      user: { select: { discordUsername: true } }
    },
    orderBy: { characterName: 'asc' }
  });

  console.log('\n📸 Profile Images in Database:\n');
  profiles.forEach(p => {
    const url = p.portraitUrl || 'None';
    const isR2 = url.includes('assets.housewolf.co');
    const emoji = isR2 ? '✅' : '⚠️';
    const displayUrl = url.length > 70 ? url.substring(0, 70) + '...' : url;
    console.log(`${emoji} ${p.characterName.padEnd(25)} | ${displayUrl}`);
  });
  console.log(`\nTotal: ${profiles.length} profiles with images\n`);
}

main().finally(() => prisma.$disconnect());
