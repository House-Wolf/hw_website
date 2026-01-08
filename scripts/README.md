# Database Maintenance Scripts

## verify-division-slugs.ts

Verifies and fixes division slugs in the database to match the application configuration.

### Usage

**Check current database (dry run):**
```bash
npx tsx scripts/verify-division-slugs.ts
```

**Fix issues in current database:**
```bash
npx tsx scripts/verify-division-slugs.ts --fix
```

### Checking Production Database

**Option 1: Using Production DATABASE_URL directly**
```bash
# Temporarily set production DATABASE_URL
DATABASE_URL="your-production-url" npx tsx scripts/verify-division-slugs.ts

# To fix issues in production
DATABASE_URL="your-production-url" npx tsx scripts/verify-division-slugs.ts --fix
```

**Option 2: Using .env.production**
```bash
# Create .env.production with your production DATABASE_URL
echo "DATABASE_URL=your-production-url" > .env.production

# Load and check
dotenv -e .env.production npx tsx scripts/verify-division-slugs.ts

# Load and fix
dotenv -e .env.production npx tsx scripts/verify-division-slugs.ts --fix
```

**Option 3: SSH into production server**
```bash
# SSH into your production server
ssh your-server

# Navigate to app directory
cd /path/to/hw_website

# Run the check
npx tsx scripts/verify-division-slugs.ts

# Fix if needed
npx tsx scripts/verify-division-slugs.ts --fix
```

**Option 4: Using Prisma Studio**
```bash
# Open Prisma Studio with production database
DATABASE_URL="your-production-url" pnpm db:studio

# Navigate to the Division table and manually check/update slugs
```

### What the script checks

- ✅ Verifies all 4 divisions exist: arcops, locops, specops, tacops
- ✅ Checks for the incorrect "arccops" slug (should be "arcops")
- ✅ Shows profile counts for each division
- ✅ Safe dry-run mode by default (won't make changes without --fix flag)

### Expected Output (Healthy Database)

```
🔍 Checking division slugs...

Mode: DRY RUN (no changes will be made)

📊 Found 4+ divisions in database

✅ TACOPS: TACOPS
   Slug: tacops
   Active: true
   Profiles: X

✅ ARCOPS: ARCOPS
   Slug: arcops
   Active: true
   Profiles: X

✅ SPECOPS: SPECOPS
   Slug: specops
   Active: true
   Profiles: X

✅ LOCOPS: LOCOPS
   Slug: locops
   Active: true
   Profiles: X

✅ All division slugs are correct!
```

### If Issues Are Found

The script will show what needs to be fixed and prompt you to run with `--fix` flag to apply changes.

Example:
```
❌ Found incorrect slug: 'arccops' should be 'arcops'
   Division has 1 member profiles

⚠️  Found 1 issue(s) to fix

🔒 DRY RUN MODE - No changes made
Run with --fix flag to apply changes: npx tsx scripts/verify-division-slugs.ts --fix
```
