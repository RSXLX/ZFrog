
import { PrismaClient } from '@prisma/client';
import { travelP0Service } from '../src/services/travel/travel-p0.service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function verifyCooldown() {
  console.log('--- Verifying Cooldown Reduction ---');

  // 1. Get a frog
  const frog = await prisma.frog.findFirst();
  if (!frog) {
    console.error('No frog found');
    return;
  }
  console.log(`Using frog: ${frog.name} (ID: ${frog.id})`);

  // 2. Start Travel 1
  console.log('Starting Travel 1 (5s duration)...');
  try {
    const t1 = await travelP0Service.startTravel({
      frogId: frog.id,
      travelType: 'SPECIFIC',
      duration: 5,
      targetChain: 'ZETACHAIN_ATHENS'
    });
    console.log(`Travel 1 started: ID ${t1.travelId}`);
  } catch (e: any) {
    console.error(`Travel 1 failed: ${e.message}`);
    return;
  }

  // 3. Wait for travel to finish + buffer (say 15s total)
  console.log('Waiting 15s for travel to finish...');
  await new Promise(resolve => setTimeout(resolve, 15000));

  // 4. Try Start Travel 2 immediately (Should fail if cooldown active)
  console.log('Attempting Travel 2 (Should FAIL - Cooldown active)...');
  try {
    await travelP0Service.startTravel({
        frogId: frog.id,
        travelType: 'SPECIFIC',
        duration: 5,
        targetChain: 'ZETACHAIN_ATHENS'
    });
    console.error('❌ Travel 2 started unexpectedly! Cooldown check failed?');
  } catch (error: any) {
    console.log(`✅ Expected Failure: ${error.message}`);
    if (error.message.includes('cooldown') || error.message.includes('Still in cooldown') || error.message.includes('revert')) {
       console.log('Cooldown/Busy check is working.');
    } else {
        console.warn('Failed for another reason?');
    }
  }

  // 5. Wait for remaining cooldown (Total 70s needed for 1m cooldown)
  console.log('Waiting 60s for cooldown to expire...');
  await new Promise(resolve => setTimeout(resolve, 60000));

  // 6. Try Travel 3 (Should SUCCEED)
  console.log('Attempting Travel 3 (Should SUCCEED)...');
  try {
    const t3 = await travelP0Service.startTravel({
        frogId: frog.id,
        travelType: 'SPECIFIC',
        duration: 5,
        targetChain: 'ZETACHAIN_ATHENS'
    });
    console.log(`✅ Travel 3 started successfully: ID ${t3.travelId}`);
  } catch (error: any) {
    console.error(`❌ Travel 3 failed: ${error.message}`);
    console.error('Did we deploy the 1m cooldown contract?');
  }

  await prisma.$disconnect();
}

verifyCooldown().catch(console.error);
