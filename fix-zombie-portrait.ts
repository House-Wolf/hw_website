import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 Fixing zombiereconnaissance portrait...\n');

  // Get the portrait URL from zombierecon profile
  const sourceProfile = await prisma.mercenaryProfile.findFirst({
    where: {
      characterName: 'zombierecon',
      portraitUrl: { not: null }
    }
  });

  if (!sourceProfile?.portraitUrl) {
    console.log('❌ No source portrait found');
    return;
  }

  console.log(`✓ Found portrait URL: ${sourceProfile.portraitUrl}\n`);

  // Update zombiereconnaissance profile
  const result = await prisma.mercenaryProfile.updateMany({
    where: {
      characterName: 'zombiereconnaissance',
      portraitUrl: null
    },
    data: {
      portraitUrl: sourceProfile.portraitUrl
    }
  });

  console.log(`✅ Updated ${result.count} profile(s)\n`);

  // Verify
  const updatedProfile = await prisma.mercenaryProfile.findFirst({
    where: { characterName: 'zombiereconnaissance' },
    include: { division: true }
  });

  if (updatedProfile) {
    console.log('Verification:');
    console.log(`  Character: ${updatedProfile.characterName}`);
    console.log(`  Division: ${updatedProfile.division.name}`);
    console.log(`  Portrait: ${updatedProfile.portraitUrl ? '✅ Set' : '❌ Still missing'}`);
  }

  console.log();
}

main().finally(() => prisma.$disconnect());
