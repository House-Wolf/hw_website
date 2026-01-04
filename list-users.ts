import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current Users in Database:\n');
  users.forEach(u => {
    console.log(`  Discord: ${u.discordUsername?.padEnd(30) || 'N/A'} | ID: ${u.id}`);
  });
  console.log(`\nTotal: ${users.length} users`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
