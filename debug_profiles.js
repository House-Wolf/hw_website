const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n=== PROFILE DISPLAY DEBUG ===\n');

  // 1. Check all profiles
  console.log('1. ALL PROFILES IN DATABASE:\n');
  const allProfiles = await prisma.mercenaryProfile.findMany({
    include: {
      rank: true,
      division: true,
      subdivision: true,
      user: { select: { discordUsername: true } }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  allProfiles.forEach(p => {
    console.log(`Character: ${p.characterName}`);
    console.log(`  User: ${p.user.discordUsername}`);
    console.log(`  Division: ${p.division.name} (${p.division.slug})`);
    console.log(`  Subdivision: ${p.subdivision?.name || 'None'}`);
    console.log(`  Rank: ${p.rank?.name || 'NONE'} (ID: ${p.rankId || 'NULL'})`);
    console.log(`  Status: ${p.status}`);
    console.log(`  IsPublic: ${p.isPublic}`);
    console.log(`  Updated: ${p.updatedAt}`);
    console.log('---');
  });

  // 2. Check APPROVED profiles
  console.log('\n2. APPROVED PROFILES:\n');
  const approved = await prisma.mercenaryProfile.findMany({
    where: { status: 'APPROVED', isPublic: true },
    include: {
      rank: true,
      division: true
    }
  });

  console.log(`Total APPROVED & PUBLIC profiles: ${approved.length}`);
  approved.forEach(p => {
    console.log(`  - ${p.characterName} (${p.division.name}, Rank: ${p.rank?.name || 'None'})`);
  });

  // 3. Check profiles by division
  console.log('\n3. PROFILES BY DIVISION:\n');
  const divisions = await prisma.division.findMany({
    include: {
      mercenaryProfiles: {
        where: { status: 'APPROVED', isPublic: true },
        include: { rank: true }
      }
    }
  });

  divisions.forEach(div => {
    console.log(`${div.name} (${div.slug}):`);
    if (div.mercenaryProfiles.length === 0) {
      console.log('  (no approved profiles)');
    } else {
      div.mercenaryProfiles.forEach(p => {
        console.log(`  - ${p.characterName} (Rank: ${p.rank?.name || 'None'})`);
      });
    }
  });

  // 4. Check leadership roster
  console.log('\n4. LEADERSHIP ROSTER (isLeadershipCore = true):\n');
  const leadership = await prisma.mercenaryProfile.findMany({
    where: {
      status: 'APPROVED',
      isPublic: true,
      rank: {
        isLeadershipCore: true
      }
    },
    include: {
      rank: true,
      user: { select: { discordUsername: true } }
    }
  });

  console.log(`Total leadership profiles: ${leadership.length}`);
  leadership.forEach(p => {
    console.log(`  - ${p.characterName} (${p.rank?.name})`);
  });

  // 5. Check for PENDING profiles (awaiting approval)
  console.log('\n5. PENDING PROFILES (awaiting approval):\n');
  const pending = await prisma.mercenaryProfile.findMany({
    where: { status: 'PENDING' },
    include: {
      rank: true,
      division: true,
      user: { select: { discordUsername: true } }
    }
  });

  console.log(`Total PENDING profiles: ${pending.length}`);
  pending.forEach(p => {
    console.log(`  - ${p.characterName} (${p.user.discordUsername})`);
    console.log(`    Division: ${p.division.name}`);
    console.log(`    Rank: ${p.rank?.name || 'NONE'}`);
    console.log(`    Submitted: ${p.lastSubmittedAt}`);
  });

  console.log('\n=== DEBUG COMPLETE ===\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
