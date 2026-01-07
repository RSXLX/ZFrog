const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const latestTravel = await prisma.travel.findFirst({
        orderBy: { id: 'desc' },
        include: { discoveries: true }
    });

    if (latestTravel) {
        console.log(`Latest Travel ID: ${latestTravel.id}`);
        console.log(`Status: ${latestTravel.status}`);
        console.log(`Discoveries Count: ${latestTravel.discoveries.length}`);
    } else {
        console.log('No travels found.');
    }

    const recent = await prisma.travelDiscovery.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    console.log('Recent 5 Discoveries:');
    console.log(JSON.stringify(recent, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
