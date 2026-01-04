/**
 * Complete Profile Migration - Creates users AND profiles
 *
 * This script:
 * 1. Creates placeholder User accounts for missing users
 * 2. Migrates all profiles from CharacterProfile.json
 * 3. Saves all base64 images
 *
 * Usage:
 *   DRY RUN: npx tsx migrate-all-profiles.ts
 *   EXECUTE: npx tsx migrate-all-profiles.ts --execute
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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

// Helper to create Discord username from character name
function createDiscordUsername(characterName: string): string {
  return characterName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 32); // Discord username max length
}

// Helper to create a deterministic Discord ID from character name
function createPlaceholderDiscordId(characterName: string): string {
  // Create a hash of the character name for a consistent Discord ID
  const hash = crypto.createHash('sha256').update(characterName).digest('hex');
  // Discord IDs are 17-19 digit numbers, we'll use the first 18 digits of the hash converted to a number
  return hash.substring(0, 18);
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

// Create or find user
async function getOrCreateUser(oldProfile: OldProfile, existingUsers: any[]): Promise<string> {
  // Try to find existing user by matching character name
  const matchedUser = existingUsers.find(u => {
    if (!u.discordUsername) return false;
    const charLower = oldProfile.characterName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const discordLower = u.discordUsername.toLowerCase().replace(/[^a-z0-9]/g, '');
    return charLower.includes(discordLower) || discordLower.includes(charLower);
  });

  if (matchedUser) {
    console.log(`  ✓ Found existing user: ${matchedUser.discordUsername}`);
    return matchedUser.id;
  }

  // Create new placeholder user
  const discordUsername = createDiscordUsername(oldProfile.characterName);
  const discordId = createPlaceholderDiscordId(oldProfile.characterName);

  console.log(`  🆕 Creating placeholder user: ${discordUsername} (Discord ID: ${discordId})`);

  if (!DRY_RUN) {
    const newUser = await prisma.user.create({
      data: {
        // Let Prisma generate a new UUID automatically
        discordId: discordId,
        discordUsername: discordUsername,
        discordDisplayName: oldProfile.characterName,
        isActive: true,
        createdAt: new Date(oldProfile.createdAt),
        updatedAt: new Date(oldProfile.updatedAt),
      },
    });
    return newUser.id;
  }

  return crypto.randomUUID(); // Return temp UUID for dry run
}

async function migrateAllProfiles() {
  console.log('=== Complete Profile Migration (with User Creation) ===');
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
  console.log(`📊 Current database: ${users.length} users, ${existingProfiles.length} profiles\n`);

  let usersCreated = 0;
  let profilesCreated = 0;
  let skipped = 0;
  let errors = 0;

  for (const oldProfile of oldProfiles) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📝 ${oldProfile.characterName}`);

    try {
      // Get or create user
      const userId = await getOrCreateUser(oldProfile, users);

      if (userId === oldProfile.userId && !users.find(u => u.id === userId)) {
        usersCreated++;
      }

      // Check if profile already exists
      const existing = existingProfiles.find(p =>
        p.userId === userId &&
        p.characterName.toLowerCase() === oldProfile.characterName.toLowerCase()
      );

      if (existing) {
        console.log(`  ⚠ Profile already exists (ID: ${existing.id}) - SKIPPING`);
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

      console.log(`  → Division: ${oldProfile.division} ➜ ${division.name}`);

      // Handle subdivision (optional)
      let subdivisionId: number | null = null;
      if (oldProfile.subDivision) {
        const subSlug = oldProfile.subDivision.toLowerCase().replace(/\s+/g, '-');
        const subdivision = subdivisions.find(s =>
          s.slug.includes(subSlug.slice(0, 10)) ||
          s.name.toLowerCase().includes(oldProfile.subDivision!.toLowerCase())
        );

        if (subdivision) {
          subdivisionId = subdivision.id;
          console.log(`  → Subdivision: ${oldProfile.subDivision} ➜ ${subdivision.name}`);
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

      // Create profile
      const profileData = {
        // Let Prisma generate a new UUID for the profile
        userId: userId,
        characterName: oldProfile.characterName,
        bio: oldProfile.bio,
        divisionId: division.id,
        subdivisionId,
        rankId,
        portraitUrl,
        status: oldProfile.approvedAt ? 'APPROVED' : 'PENDING',
        isPublic: true,
        approvedAt: oldProfile.approvedAt ? new Date(oldProfile.approvedAt) : null,
        approvedBy: null,
        createdAt: new Date(oldProfile.createdAt),
        updatedAt: new Date(oldProfile.updatedAt),
      };

      if (!DRY_RUN) {
        await prisma.mercenaryProfile.create({ data: profileData });
        console.log(`  ✅ Created profile`);
        profilesCreated++;
      } else {
        console.log(`  ✓ Would create profile (DRY RUN)`);
        profilesCreated++;
      }

    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}`);
      errors++;
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`\n📊 Migration Summary:`);
  console.log(`  👥 ${usersCreated} placeholder users ${DRY_RUN ? 'would be created' : 'created'}`);
  console.log(`  📝 ${profilesCreated} profiles ${DRY_RUN ? 'would be created' : 'created'}`);
  console.log(`  ⚠️  ${skipped} profiles skipped (already exist)`);
  console.log(`  ✗ ${errors} errors`);

  if (DRY_RUN) {
    console.log(`\n💡 To execute the migration, run:`);
    console.log(`   npx tsx migrate-all-profiles.ts --execute\n`);
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log(`\n⚠️  NOTE: Placeholder users were created with temporary Discord IDs.`);
    console.log(`   When these users sign in via Discord OAuth, their accounts will be updated.\n`);
  }
}

migrateAllProfiles()
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
