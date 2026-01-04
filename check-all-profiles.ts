import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 Checking all profiles for portrait issues...\n');

  // Get all profiles grouped by user
  const users = await prisma.user.findMany({
    include: {
      mercenaryProfiles: {
        include: {
          division: true,
          subdivision: true,
          rank: true
        },
        orderBy: { createdAt: 'asc' }
      }
    },
    where: {
      mercenaryProfiles: { some: {} }
    }
  });

  let usersWithMultipleProfiles = 0;
  let profilesWithoutPortraits = 0;

  users.forEach(user => {
    if (user.mercenaryProfiles.length > 1) {
      usersWithMultipleProfiles++;
      console.log(`\n👤 ${user.discordUsername} has ${user.mercenaryProfiles.length} profiles:`);

      user.mercenaryProfiles.forEach((profile, i) => {
        const hasPortrait = !!profile.portraitUrl;
        const emoji = hasPortrait ? '✅' : '❌';

        console.log(`  ${i + 1}. ${emoji} ${profile.characterName}`);
        console.log(`     Division: ${profile.division.name}`);
        console.log(`     Status: ${profile.status}`);
        console.log(`     Portrait: ${hasPortrait ? 'Yes' : 'NO - MISSING'}`);

        if (!hasPortrait) profilesWithoutPortraits++;
      });
    } else if (!user.mercenaryProfiles[0].portraitUrl) {
      console.log(`\n❌ ${user.discordUsername} - ${user.mercenaryProfiles[0].characterName}`);
      console.log(`   Division: ${user.mercenaryProfiles[0].division.name}`);
      console.log(`   Portrait: MISSING`);
      profilesWithoutPortraits++;
    }
  });

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`\n📊 Summary:`);
  console.log(`  Users with multiple profiles: ${usersWithMultipleProfiles}`);
  console.log(`  Profiles without portraits: ${profilesWithoutPortraits}`);
  console.log();
}

main().finally(() => prisma.$disconnect());
