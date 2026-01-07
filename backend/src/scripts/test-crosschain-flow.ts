/**
 * Test Cross-Chain Travel Full Flow
 * 
 * Tests:
 * 1. Check frog eligibility
 * 2. Create cross-chain travel record
 * 3. Complete travel with exploration and diary
 * 4. Verify discoveries are saved
 */

import { PrismaClient } from '@prisma/client';
import { omniTravelService } from '../services/omni-travel.service';

const prisma = new PrismaClient();

async function testCrossChainFlow() {
  const tokenId = 3; // Test with Frog #3
  const targetChainId = 97; // BSC Testnet
  
  console.log('='.repeat(60));
  console.log('🧪 Cross-Chain Travel Full Flow Test');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Check eligibility
    console.log('\n📋 Step 1: Checking eligibility...');
    const eligibility = await omniTravelService.canStartCrossChainTravel(tokenId, targetChainId);
    console.log(`   Can Start: ${eligibility.canStart}`);
    if (!eligibility.canStart) {
      console.log(`   Reason: ${eligibility.reason}`);
    }
    
    // Step 2: Get frog info
    console.log('\n🐸 Step 2: Getting frog info...');
    const frog = await prisma.frog.findFirst({ where: { tokenId } });
    if (!frog) {
      console.log('   ❌ Frog not found!');
      return;
    }
    console.log(`   Name: ${frog.name}`);
    console.log(`   Status: ${frog.status}`);
    console.log(`   XP: ${frog.xp}`);
    
    // Step 3: Create test travel record (simulate backend creation)
    console.log('\n📝 Step 3: Creating test travel record...');
    const travel = await prisma.travel.create({
      data: {
        frogId: frog.id,
        targetWallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f00ab2', // Random test address
        targetChain: 'BSC_TESTNET',
        duration: 60, // 1 minute for quick test
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 1000), // 1 minute from now
        status: 'Active',
        isCrossChain: true,
        crossChainStatus: 'CROSSING_OUT',
        currentStage: 'CROSSING',
        progress: 50,
      },
    });
    console.log(`   Travel ID: ${travel.id}`);
    console.log(`   Status: ${travel.status}`);
    
    // Update frog status
    await prisma.frog.update({
      where: { id: frog.id },
      data: { status: 'Traveling' },
    });
    console.log('   Frog status -> Traveling');
    
    // Step 4: Complete travel with exploration and diary
    console.log('\n🎯 Step 4: Completing travel with exploration...');
    console.log('   (This will run block exploration and generate diary)');
    
    await omniTravelService.completeCrossChainTravel(tokenId, travel.id);
    
    // Step 5: Verify results
    console.log('\n✅ Step 5: Verifying results...');
    
    // Check travel record
    const completedTravel = await prisma.travel.findUnique({
      where: { id: travel.id },
      include: { discoveries: true },
    });
    
    if (completedTravel) {
      console.log(`   Travel Status: ${completedTravel.status}`);
      console.log(`   Cross-Chain Status: ${completedTravel.crossChainStatus}`);
      console.log(`   XP Earned: ${completedTravel.crossChainXpEarned}`);
      console.log(`   Explored Block: ${completedTravel.exploredBlock?.toString() || 'N/A'}`);
      console.log(`   Discoveries Count: ${completedTravel.discoveries?.length || 0}`);
      
      if (completedTravel.journalContent) {
        console.log('\n📖 Generated Diary:');
        console.log('-'.repeat(40));
        console.log(completedTravel.journalContent);
        console.log('-'.repeat(40));
      }
      
      if (completedTravel.discoveries && completedTravel.discoveries.length > 0) {
        console.log('\n🔍 Discoveries:');
        for (const d of completedTravel.discoveries) {
          console.log(`   [${d.type}] ${d.title}: ${d.description}`);
        }
      }
    }
    
    // Check frog final status
    const finalFrog = await prisma.frog.findUnique({ where: { id: frog.id } });
    console.log(`\n🐸 Frog Final Status: ${finalFrog?.status}`);
    console.log(`   Final XP: ${finalFrog?.xp}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCrossChainFlow();
