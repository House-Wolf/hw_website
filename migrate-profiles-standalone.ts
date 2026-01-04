/**
 * STANDALONE Migration Script for Character Profiles
 *
 * This script reads CharacterProfile.json and shows you what would be migrated.
 * Review the output, then uncomment the actual migration code to execute.
 *
 * Usage: npx tsx migrate-profiles-standalone.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OldProfile {
  id: string;
  userId: string;
  characterName: string;
  division: string;
  bio: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedById?: string;
  subDivision?: string;
}

async function analyzeProfiles() {
  console.log('=== Character Profile Migration Analysis ===\n');

  const jsonPath = path.join(process.cwd(), 'CharacterProfile.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const oldProfiles: OldProfile[] = JSON.parse(jsonData);

  console.log(`Found ${oldProfiles.length} profiles to analyze\n`);

  // Get current database state
  const divisions = await prisma.division.findMany();
  const subdivisions = await prisma.subdivision.findMany({ include: { division: true } });
  const ranks = await prisma.rank.findMany();
  const users = await prisma.user.findMany();
  const existingProfiles = await prisma.mercenaryProfile.findMany({
    include: { user: true, division: true }
  });

  console.log('📊 Database Summary:');
  console.log(`  - ${divisions.length} divisions`);
  console.log(`  - ${subdivisions.length} subdivisions`);
  console.log(`  - ${ranks.length} ranks`);
  console.log(`  - ${users.length} users`);
  console.log(`  - ${existingProfiles.length} existing profiles\n`);

  console.log('📋 Profile Analysis:\n');

  for (const profile of oldProfiles) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`Character: ${profile.characterName}`);
    console.log(`  Old Division: ${profile.division}`);
    console.log(`  Old Subdivision: ${profile.subDivision || 'None'}`);
    console.log(`  User ID: ${profile.userId}`);

    // Check if user exists
    const user = users.find(u => u.id === profile.userId);
    if (user) {
      console.log(`  ✓ User found: ${user.discordUsername}`);
    } else {
      console.log(`  ✗ User NOT FOUND - Cannot migrate this profile`);
      continue;
    }

    // Check if profile already exists
    const existing = existingProfiles.find(p =>
      p.userId === profile.userId && p.characterName === profile.characterName
    );
    if (existing) {
      console.log(`  ⚠ Profile already exists: ${existing.division.slug} (ID: ${existing.id})`);
      console.log(`     Action: Would UPDATE existing profile`);
    } else {
      console.log(`  ✓ New profile - would CREATE`);
    }

    // Suggest division mapping
    let targetDivision;
    if (profile.division.includes('Research') || profile.division.includes('Cartography')) {
      targetDivision = divisions.find(d => d.slug === 'arcops');
    } else if (profile.division.includes('Logistics')) {
      targetDivision = divisions.find(d => d.slug === 'locops');
    } else if (profile.division.includes('Special Operations')) {
      targetDivision = divisions.find(d => d.slug === 'specops');
    } else if (profile.division.includes('Leadership') || profile.division.includes('Officer') || profile.division.includes('Commissioned')) {
      targetDivision = divisions.find(d => d.slug === 'house-wolf-command');
    } else {
      targetDivision = divisions.find(d => d.slug === 'house-wolf-command'); // Default
    }

    if (targetDivision) {
      console.log(`  → Target Division: ${targetDivision.name} (${targetDivision.slug})`);
    }

    // Check for image
    if (profile.imageUrl && profile.imageUrl.startsWith('data:image')) {
      const sizeKB = Math.round(profile.imageUrl.length * 0.75 / 1024);
      console.log(`  📷 Has base64 image (${sizeKB} KB) - would save to /uploads/profiles/`);
    }

    // Check approval status
    if (profile.approvedAt) {
      console.log(`  ✓ Approved on: ${new Date(profile.approvedAt).toLocaleDateString()}`);
    } else {
      console.log(`  ⚠ Not yet approved - would set status to PENDING`);
    }
  }

  console.log(`\n${'='.repeat(80)}\n`);
  console.log('✅ Analysis Complete');
  console.log(`\nTo proceed with migration:`);
  console.log(`1. Review the analysis above`);
  console.log(`2. Ensure all users exist in the database`);
  console.log(`3. Uncomment the migration code in this script`);
  console.log(`4. Run: npx tsx migrate-profiles-standalone.ts\n`);
}

async function main() {
  await analyzeProfiles();

  /*
   * UNCOMMENT THIS SECTION TO RUN ACTUAL MIGRATION
   *
  console.log('\n⚠️  WARNING: Actual migration would run here');
  console.log('Uncomment the migration code to proceed\n');
  */
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
