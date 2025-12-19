import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const frogs = await prisma.frog.findMany({
    take: 10,
    select: {
      id: true,
      tokenId: true,
      name: true
    }
  });
  console.log('Frogs in database:');
  console.log(JSON.stringify(frogs, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
