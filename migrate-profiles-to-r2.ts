/**
 * Migration Script: Upload Profile Images to R2
 *
 * This script:
 * 1. Reads all profile images from /uploads/profiles/
 * 2. Uploads them to Cloudflare R2 storage
 * 3. Updates MercenaryProfile records with R2 URLs
 * 4. Processes images to webp format (400x400)
 *
 * Usage:
 *   DRY RUN: npx tsx migrate-profiles-to-r2.ts
 *   EXECUTE: npx tsx migrate-profiles-to-r2.ts --execute
 */

import { PrismaClient } from '@prisma/client';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2 } from './lib/storage/r2Client';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import crypto from 'crypto';

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--execute');

async function uploadImageToR2(localPath: string, filename: string): Promise<string> {
  try {
    console.log(`  📤 Processing: ${filename}`);

    // Read the local file
    const fileBuffer = fs.readFileSync(localPath);
    console.log(`    ✓ Read file: ${(fileBuffer.length / 1024).toFixed(2)} KB`);

    // Process image with Sharp (resize to 400x400, convert to webp)
    const processedBuffer = await sharp(fileBuffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center',
      })
      .toFormat('webp', { quality: 85 })
      .toBuffer();

    console.log(`    ✓ Processed: ${(processedBuffer.length / 1024).toFixed(2)} KB (webp)`);

    // Generate R2 key
    const key = `portraits/profile-${crypto.randomUUID()}.webp`;

    if (!DRY_RUN) {
      // Upload to R2
      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET!,
          Key: key,
          Body: processedBuffer,
          ContentType: 'image/webp',
        })
      );
      console.log(`    ✓ Uploaded to R2: ${key}`);
    } else {
      console.log(`    ✓ Would upload to R2: ${key}`);
    }

    // Construct public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return publicUrl;
  } catch (error) {
    console.error(`    ✗ Error processing ${filename}:`, error);
    throw error;
  }
}

async function migrateProfilesToR2() {
  console.log('=== Profile Images R2 Migration ===');
  console.log(DRY_RUN ? '🔍 DRY RUN MODE\n' : '⚠️  EXECUTE MODE\n');

  // Verify R2 configuration
  const requiredEnvVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL'];
  const missing = requiredEnvVars.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing R2 environment variables:', missing.join(', '));
    console.error('Please configure these in your .env file before running this script.');
    process.exit(1);
  }

  console.log('✅ R2 Configuration verified\n');

  // Get all profiles with local portrait URLs
  const profiles = await prisma.mercenaryProfile.findMany({
    where: {
      portraitUrl: { not: null },
    },
    include: {
      user: true,
    },
  });

  console.log(`📊 Found ${profiles.length} profiles with portraits\n`);

  const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');

  if (!fs.existsSync(uploadsDir)) {
    console.error(`❌ Uploads directory not found: ${uploadsDir}`);
    process.exit(1);
  }

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const profile of profiles) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`👤 ${profile.characterName} (${profile.user.discordUsername})`);

    const currentUrl = profile.portraitUrl;

    // Skip if already using R2
    if (currentUrl && currentUrl.includes('r2.cloudflarestorage.com')) {
      console.log(`  ⚠️  Already using R2: ${currentUrl}`);
      skipped++;
      continue;
    }

    if (!currentUrl) {
      console.log(`  ⚠️  No portrait URL set`);
      skipped++;
      continue;
    }

    // Check if local file exists
    const localPath = path.join(uploadsDir, currentUrl);

    if (!fs.existsSync(localPath)) {
      console.log(`  ✗ Local file not found: ${currentUrl}`);
      errors++;
      continue;
    }

    try {
      // Upload to R2
      const r2Url = await uploadImageToR2(localPath, currentUrl);

      // Update database
      if (!DRY_RUN) {
        await prisma.mercenaryProfile.update({
          where: { id: profile.id },
          data: { portraitUrl: r2Url },
        });
        console.log(`    ✅ Database updated with R2 URL`);
      } else {
        console.log(`    ✓ Would update database with: ${r2Url}`);
      }

      uploaded++;
    } catch (error) {
      console.error(`    ✗ Migration failed:`, error);
      errors++;
    }
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`\n📊 Migration Summary:`);
  console.log(`  ✅ ${uploaded} images ${DRY_RUN ? 'would be' : ''} uploaded to R2`);
  console.log(`  ⚠️  ${skipped} profiles skipped`);
  console.log(`  ✗ ${errors} errors`);

  if (DRY_RUN) {
    console.log(`\n💡 To execute the migration, run:`);
    console.log(`   npx tsx migrate-profiles-to-r2.ts --execute\n`);
  } else {
    console.log(`\n✅ Migration complete!`);
    console.log(`📁 Original files are still in /uploads/profiles/ (safe to delete after verification)\n`);
  }
}

migrateProfilesToR2()
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
