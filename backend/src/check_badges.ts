
import { prisma } from './database';

async function checkBadges() {
  try {
    const badges = await prisma.travelBadge.findMany();
    console.log('Total badges found:', badges.length);
    if (badges.length > 0) {
      console.log('Badges:', badges);
    } else {
      console.log('No badges found in the database.');
    }
  } catch (error) {
    console.error('Error checking badges:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBadges();
