import { getDivisionRoster } from './lib/divisions/getDivisionsRoster';

async function main() {
  console.log('\n🧪 Testing getDivisionRoster function...\n');

  const testSlugs = ['arcops', 'locops', 'specops', 'tacops'] as const;

  for (const slug of testSlugs) {
    try {
      console.log(`Testing ${slug.toUpperCase()}...`);
      const result = await getDivisionRoster(slug);

      console.log(`  ✅ Success!`);
      console.log(`     Division: ${result.division.name}`);
      console.log(`     Command Roster: ${result.commandRoster.length}`);
      console.log(`     Officers: ${result.officers.length}`);
      console.log(`     Members: ${result.members.length}`);
      console.log(`     Total: ${result.commandRoster.length + result.officers.length + result.members.length}`);
      console.log();
    } catch (error) {
      console.log(`  ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
      console.log();
    }
  }
}

main().catch(console.error);
