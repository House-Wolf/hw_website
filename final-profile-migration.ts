/**
 * Final Character Profile Migration Script
 *
 * This script safely migrates CharacterProfile.json data by:
 * 1. Matching profiles to current users by character/Discord name
 * 2. Saving base64 images to the file system
 * 3. Mapping old divisions to new structure
 * 4. NOT overwriting existing profiles (safe mode)
 *
 * Usage:
 *   DRY RUN: npx tsx final-profile-migration.ts
 *   ACTUAL:  npx tsx final-profile-migration.ts --execute
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--execute');

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

// User matching helper
function matchUser(characterName: string, discordUsername: string): boolean {
  const charLower = characterName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const discordLower = discordUsername.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Direct match
  if (charLower === discordLower) return true;

  // Character name contains discord name or vice versa
  if (charLower.includes(discordLower) || discordLower.includes(charLower)) {
    return true;
  }

  // Remove common suffixes/prefixes
  const charBase = charLower.replace(/(wolf|_|-|\.)/g, '');
  const discordBase = discordLower.replace(/(wolf|_|-|\.)/g, '');

  return charBase === discordBase || charBase.includes(discordBase) || discordBase.includes(charBase);
}

// Division mapping
function getDivisionSlug(oldDivision: string): string {
  if (oldDivision.includes('Research') || oldDivision.includes('Cartography')) {
    return 'arcops';
  }
  if (oldDivision.includes('Logistics')) {
    return 'locops';
  }
  if (oldDivision.includes('Special Operations')) {
    return 'specops';
  }
  // Leadership, Officer, NCO → House Wolf Command
  return 'house-wolf-command';
}

// Save base64 image
async function saveBase64Image(base64Data: string, characterName: string): Promise<string | null> {
  if (!base64Data || !base64Data.startsWith('data:image')) {
    return null;
  }

  try {
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const [, fileType, data] = matches;
    const buffer = Buffer.from(data, 'base64');

    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const sanitizedName = characterName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const filename = `${sanitizedName}_${timestamp}.${fileType}`;
    const filepath = path.join(uploadDir, filename);

    if (!DRY_RUN) {
      fs.writeFileSync(filepath, buffer);
    }

    return filename;
  } catch (error) {
    console.error(`  ✗ Error saving image: ${error}`);
    return null;
  }
}

async function migrateProfiles() {
  console.log('=== Character Profile Migration ===');
  console.log(DRY_RUN ? '🔍 DRY RUN MODE - No changes will be made\n' : '⚠️  EXECUTE MODE - Changes will be saved to database\n');

  // Load data
  const jsonPath = path.join(process.cwd(), 'CharacterProfile.json');
  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const oldProfiles: OldProfile[] = JSON.parse(jsonData);

  const users = await prisma.user.findMany();
  const divisions = await prisma.division.findMany();
  const subdivisions = await prisma.subdivision.findMany({ include: { division: true } });
  const ranks = await prisma.rank.findMany();
  const existingProfiles = await prisma.mercenaryProfile.findMany({
    include: { user: true }
  });

  console.log(`📊 Found ${oldProfiles.length} profiles to migrate`);
  console.log(`📊 Current database has ${users.length} users, ${existingProfiles.length} existing profiles\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const oldProfile of oldProfiles) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📝 ${oldProfile.characterName}`);

    // Find matching user
    const matchedUser = users.find(u =>
      u.discordUsername && matchUser(oldProfile.characterName, u.discordUsername)
    );

    if (!matchedUser) {
      console.log(`  ✗ No matching user found`);
      console.log(`     Tried to match: ${oldProfile.characterName}`);
      console.log(`     Available users: ${users.map(u => u.discordUsername).join(', ')}`);
      skipped++;
      continue;
    }

    console.log(`  ✓ Matched user: ${matchedUser.discordUsername} (${matchedUser.id})`);

    // Check if profile already exists for this user
    const existing = existingProfiles.find(p =>
      p.userId === matchedUser.id &&
      p.characterName.toLowerCase() === oldProfile.characterName.toLowerCase()
    );

    if (existing) {
      console.log(`  ⚠ Profile already exists (ID: ${existing.id}) - SKIPPING to avoid overwrite`);
      skipped++;
      continue;
    }

    // Get division
    const divisionSlug = getDivisionSlug(oldProfile.division);
    const division = divisions.find(d => d.slug === divisionSlug);

    if (!division) {
      console.log(`  ✗ Division not found: ${divisionSlug}`);
      errors++;
      continue;
    }

    console.log(`  → Division: ${oldProfile.division} ➜ ${division.name} (${division.slug})`);

    // Handle subdivision (optional, may not exist)
    let subdivisionId: number | null = null;
    if (oldProfile.subDivision) {
      const subSlug = oldProfile.subDivision.toLowerCase().replace(/\s+/g, '-');
      const subdivision = subdivisions.find(s =>
        s.slug.includes(subSlug.slice(0, 10)) || s.name.toLowerCase().includes(oldProfile.subDivision!.toLowerCase())
      );

      if (subdivision) {
        subdivisionId = subdivision.id;
        console.log(`  → Subdivision: ${oldProfile.subDivision} ➜ ${subdivision.name}`);
      } else {
        console.log(`  ⚠ Subdivision not found: ${oldProfile.subDivision} (will be null)`);
      }
    }

    // Handle rank (optional)
    let rankId: number | null = null;
    if (oldProfile.subDivision) {
      const rankSlug = oldProfile.subDivision.toLowerCase().replace(/\s+/g, '-');
      const rank = ranks.find(r => r.slug === rankSlug);
      if (rank) {
        rankId = rank.id;
        console.log(`  → Rank: ${rank.name}`);
      }
    }

    // Handle image
    let portraitUrl: string | null = null;
    if (oldProfile.imageUrl) {
      const filename = await saveBase64Image(oldProfile.imageUrl, oldProfile.characterName);
      if (filename) {
        portraitUrl = filename;
        console.log(`  📷 Saved image: ${filename}`);
      }
    }

    // Prepare profile data
    const profileData = {
      id: oldProfile.id,
      userId: matchedUser.id,
      characterName: oldProfile.characterName,
      bio: oldProfile.bio,
      divisionId: division.id,
      subdivisionId,
      rankId,
      portraitUrl,
      status: oldProfile.approvedAt ? 'APPROVED' : 'PENDING',
      isPublic: true,
      approvedAt: oldProfile.approvedAt ? new Date(oldProfile.approvedAt) : null,
      approvedBy: null, // Old approver IDs won't match
      createdAt: new Date(oldProfile.createdAt),
      updatedAt: new Date(oldProfile.updatedAt),
    };

    if (!DRY_RUN) {
      try {
        await prisma.mercenaryProfile.create({ data: profileData });
        console.log(`  ✅ Created profile successfully`);
        created++;
      } catch (error: any) {
        console.log(`  ✗ Error creating profile: ${error.message}`);
        errors++;
      }
    } else {
      console.log(`  ✓ Would create profile (DRY RUN)`);
      created++;
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`\n📊 Migration Summary:`);
  console.log(`  ✅ ${created} profiles ${DRY_RUN ? 'would be created' : 'created'}`);
  console.log(`  ⚠️  ${skipped} profiles skipped (already exist or no user match)`);
  console.log(`  ✗ ${errors} errors`);

  if (DRY_RUN) {
    console.log(`\n💡 To execute the migration, run:`);
    console.log(`   npx tsx final-profile-migration.ts --execute\n`);
  } else {
    console.log(`\n✅ Migration complete!\n`);
  }
}

migrateProfiles()
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
