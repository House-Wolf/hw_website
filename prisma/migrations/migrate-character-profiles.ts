/**
 * Migration script to import Character Profiles from CharacterProfile.json
 * into the new MercenaryProfile database structure.
 *
 * This script:
 * 1. Reads the old CharacterProfile.json file
 * 2. Maps old division/subdivision names to new database IDs
 * 3. Converts base64 images to files and uploads them
 * 4. Creates or updates MercenaryProfile records
 * 5. Sets appropriate approval status
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Division name mapping from old to new slugs
const DIVISION_MAPPING: Record<string, string> = {
  'Advanced Research and Cartography Operations': 'arcops',
  'Logistics and Command Operations Division': 'locops',
  'Special Operations Division': 'specops',
  'Leadership Core': 'leadership', // Will need to determine actual division
  'Non-Commissioned Officers': 'nco', // Will need to determine actual division
  'Officer Core': 'officer', // Will need to determine actual division
};

// Subdivision mapping
const SUBDIVISION_MAPPING: Record<string, string> = {
  'ARCOPS Command': 'arcops-command',
  'LOCOPS Command': 'locops-command',
  'TACOPS Command': 'tacops-command',
  'Heavy Lift': 'heavy-lift',
  'Medic': 'medic',
  'Fleet Commander': 'fleet-commander',
  'Clan Warlord': 'clan-warlord',
  'Platoon Sergeant': 'platoon-sergeant',
};

// Rank mapping
const RANK_MAPPING: Record<string, string> = {
  'Leadership Core': 'leadership-core',
  'Officer Core': 'officer-core',
  'Non-Commissioned Officers': 'nco',
};

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

async function saveBase64Image(base64Data: string, characterName: string): Promise<string | null> {
  if (!base64Data || !base64Data.startsWith('data:image')) {
    return null;
  }

  try {
    // Extract the base64 data and file type
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      console.warn(`Invalid base64 image data for ${characterName}`);
      return null;
    }

    const [, fileType, data] = matches;
    const buffer = Buffer.from(data, 'base64');

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate filename
    const sanitizedName = characterName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const timestamp = Date.now();
    const filename = `${sanitizedName}_${timestamp}.${fileType}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    fs.writeFileSync(filepath, buffer);
    console.log(`✓ Saved image for ${characterName}: ${filename}`);

    return filename;
  } catch (error) {
    console.error(`Error saving image for ${characterName}:`, error);
    return null;
  }
}

async function getDivisionId(divisionName: string): Promise<number> {
  const slug = DIVISION_MAPPING[divisionName];

  if (!slug) {
    console.warn(`Unknown division: ${divisionName}, defaulting to ARCOPS`);
    const defaultDiv = await prisma.division.findFirst({
      where: { slug: 'arcops' }
    });
    return defaultDiv!.id;
  }

  // Special handling for Leadership Core, Officer Core, NCO
  // These should be assigned to a primary division (defaulting to appropriate one)
  if (['leadership', 'officer', 'nco'].includes(slug)) {
    // For now, assign Leadership Core to all divisions (they'll specify later)
    // Let's default to TACOPS for officers, SPECOPS for NCO
    const defaultSlug = slug === 'leadership' ? 'arcops' :
                        slug === 'officer' ? 'tacops' : 'specops';

    const division = await prisma.division.findFirst({
      where: { slug: defaultSlug }
    });

    if (!division) {
      throw new Error(`Division with slug '${defaultSlug}' not found in database`);
    }

    return division.id;
  }

  const division = await prisma.division.findFirst({
    where: { slug }
  });

  if (!division) {
    throw new Error(`Division with slug '${slug}' not found in database`);
  }

  return division.id;
}

async function getSubdivisionId(subdivisionName: string | undefined, divisionId: number): Promise<number | null> {
  if (!subdivisionName) {
    return null;
  }

  const slug = SUBDIVISION_MAPPING[subdivisionName];
  if (!slug) {
    console.warn(`Unknown subdivision: ${subdivisionName}`);
    return null;
  }

  const subdivision = await prisma.subdivision.findFirst({
    where: {
      slug,
      divisionId
    }
  });

  if (!subdivision) {
    console.warn(`Subdivision '${subdivisionName}' (${slug}) not found in database`);
    return null;
  }

  return subdivision.id;
}

async function getRankId(divisionName: string): Promise<number | null> {
  const rankSlug = RANK_MAPPING[divisionName];

  if (!rankSlug) {
    return null;
  }

  const rank = await prisma.rank.findFirst({
    where: { slug: rankSlug }
  });

  if (!rank) {
    console.warn(`Rank '${rankSlug}' not found in database`);
    return null;
  }

  return rank.id;
}

async function migrateProfile(oldProfile: OldProfile): Promise<void> {
  console.log(`\nMigrating profile: ${oldProfile.characterName}`);

  try {
    // Get or create user
    let user = await prisma.user.findUnique({
      where: { id: oldProfile.userId }
    });

    if (!user) {
      console.warn(`  User ${oldProfile.userId} not found, skipping profile ${oldProfile.characterName}`);
      return;
    }

    // Get division ID
    const divisionId = await getDivisionId(oldProfile.division);
    console.log(`  Division: ${oldProfile.division} → ID ${divisionId}`);

    // Get subdivision ID
    const subdivisionId = await getSubdivisionId(oldProfile.subDivision, divisionId);
    if (oldProfile.subDivision) {
      console.log(`  Subdivision: ${oldProfile.subDivision} → ID ${subdivisionId || 'not found'}`);
    }

    // Get rank ID
    const rankId = await getRankId(oldProfile.division);
    if (rankId) {
      console.log(`  Rank: ${oldProfile.division} → ID ${rankId}`);
    }

    // Handle image
    let portraitUrl: string | null = null;
    if (oldProfile.imageUrl) {
      const filename = await saveBase64Image(oldProfile.imageUrl, oldProfile.characterName);
      if (filename) {
        portraitUrl = filename;
      }
    }

    // Check if profile already exists
    const existingProfile = await prisma.mercenaryProfile.findFirst({
      where: {
        userId: oldProfile.userId,
        divisionId,
      }
    });

    const profileData = {
      characterName: oldProfile.characterName,
      bio: oldProfile.bio,
      divisionId,
      subdivisionId,
      rankId,
      portraitUrl,
      status: oldProfile.approvedAt ? 'APPROVED' : 'PENDING',
      isPublic: true,
      approvedAt: oldProfile.approvedAt ? new Date(oldProfile.approvedAt) : null,
      approvedBy: oldProfile.approvedById || null,
      createdAt: new Date(oldProfile.createdAt),
      updatedAt: new Date(oldProfile.updatedAt),
    };

    if (existingProfile) {
      console.log(`  Updating existing profile ID: ${existingProfile.id}`);
      await prisma.mercenaryProfile.update({
        where: { id: existingProfile.id },
        data: profileData,
      });
    } else {
      console.log(`  Creating new profile with ID: ${oldProfile.id}`);
      await prisma.mercenaryProfile.create({
        data: {
          id: oldProfile.id,
          userId: oldProfile.userId,
          ...profileData,
        },
      });
    }

    console.log(`  ✓ Successfully migrated ${oldProfile.characterName}`);
  } catch (error) {
    console.error(`  ✗ Error migrating ${oldProfile.characterName}:`, error);
    throw error;
  }
}

async function main() {
  console.log('=== Character Profile Migration ===\n');

  // Read the JSON file
  const jsonPath = path.join(process.cwd(), 'CharacterProfile.json');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`CharacterProfile.json not found at ${jsonPath}`);
  }

  const jsonData = fs.readFileSync(jsonPath, 'utf-8');
  const oldProfiles: OldProfile[] = JSON.parse(jsonData);

  console.log(`Found ${oldProfiles.length} profiles to migrate\n`);

  // Migrate each profile
  for (const oldProfile of oldProfiles) {
    await migrateProfile(oldProfile);
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Successfully migrated ${oldProfiles.length} profiles`);
}

main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
