import { prisma } from "../lib/prisma";

async function checkDatabase() {
  console.log("Checking database...\n");

  const users = await prisma.user.findMany({
    include: {
      accounts: true,
    },
  });

  console.log(`Found ${users.length} users:`);
  users.forEach((user) => {
    console.log(`\nUser ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Discord ID: ${user.discordId}`);
    console.log(`Accounts: ${user.accounts.length}`);
    user.accounts.forEach((account) => {
      console.log(`  - Provider: ${account.provider}, ID: ${account.providerAccountId}`);
    });
  });

  await prisma.$disconnect();
}

checkDatabase();
