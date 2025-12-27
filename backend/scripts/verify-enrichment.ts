
import { PrismaClient } from '@prisma/client';
import { travelP0Service } from '../src/services/travel/travel-p0.service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function verifyEnrichment() {
  console.log('--- Verifying Data Enrichment ---');

  // 1. Get a frog
  const frog = await prisma.frog.findFirst();
  if (!frog) {
    console.error('No frog found');
    return;
  }
  console.log(`Using frog: ${frog.name} (ID: ${frog.id})`);

  // 2. Start Travel (P0) with short duration
  console.log('Starting travel...');
  const result = await travelP0Service.startTravel({
    frogId: frog.id,
    travelType: 'RANDOM',
    duration: 5, // 5 seconds
    targetChain: 'ETH_SEPOLIA' // Use Sepolia for reliable data or ZETACHAIN_ATHENS
  });
  
  console.log(`Travel started: ID ${result.travelId}, waiting 10s for completion...`);

  // 3. Wait
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 4. Check result
  const travel = await prisma.travel.findUnique({
    where: { id: result.travelId }
  });

  if (!travel) {
    console.error('Travel record not found');
    return;
  }

  console.log('--- Travel Result ---');
  console.log(`Status: ${travel.status}`);
  console.log('Diary:', travel.diary);
  
  const snapshot = travel.exploredSnapshot as any;
  if (snapshot) {
    console.log('\n--- Snapshot Data ---');
    console.log('Address:', snapshot.address);
    console.log('Tokens:', snapshot.tokens);
    console.log('Tx Count:', snapshot.txCount);
  } else {
    console.log('No snapshot data found');
  }
  
  // Clean up
  await prisma.$disconnect();
}

verifyEnrichment().catch(console.error);
