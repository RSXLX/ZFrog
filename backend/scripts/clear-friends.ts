import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.friendInteraction.deleteMany({});
  await prisma.friendship.deleteMany({});
  console.log('Cleared friendships and interactions.');
  await prisma.$disconnect();
}

main().catch(console.error);
