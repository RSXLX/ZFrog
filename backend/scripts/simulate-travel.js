
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function simulateTravel() {
    console.log('--- Simulating Travel ---');
    
    // 1. Get a frog
    const frogId = 1; // Force using frog 1
    const frog = await prisma.frog.findUnique({
        where: { id: frogId }
    });
    if (!frog) {
        console.error('❌ No frogs found in DB to simulate travel with.');
        return;
    }
    console.log(`🐸 Using Frog: ${frog.name} (ID: ${frog.id}, TokenID: ${frog.tokenId})`);

    // 2. Create a mock Active travel that is "ready to finish"
    const now = new Date();
    const past = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
    
    // Check if there is already an active travel for this frog, if so, use it or skip
    const existingTravel = await prisma.travel.findFirst({
        where: { frogId: frog.id, status: 'Active' }
    });

    let travelId;

    if (existingTravel) {
        console.log(`ℹ️ Found existing active travel ${existingTravel.id}. Using it.`);
        // Force end time to be in the past so it gets picked up
        await prisma.travel.update({
            where: { id: existingTravel.id },
            data: { endTime: new Date(now.getTime() - 1000) }
        });
        travelId = existingTravel.id;
    } else {
        console.log('✨ Creating new mock travel record...');
        const travel = await prisma.travel.create({
            data: {
                frogId: frog.id,
                targetWallet: '0x0000000000000000000000000000000000000000', // Random
                chainId: 7001,
                status: 'Active',
                startTime: past,
                endTime: new Date(now.getTime() - 1000), // Finished 1 second ago
                isRandom: true,
                observedTxCount: 0,
                observedTotalValue: "0"
            }
        });
        travelId = travel.id;
        console.log(`✅ Created Travel ID: ${travelId}`);
        console.log('Created Travel:', travel);
    }

    // Debug: Check directly what findMany sees
    const pendingCount = await prisma.travel.count({
        where: {
            status: 'Active',
            endTime: { lte: new Date() }
        }
    });
    console.log(`🔍 Pending Travels Count (Direct): ${pendingCount}`);

    // 3. Trigger Processor
    console.log('🚀 Triggering Travel Processor...');
    
    // We need to import the service that processes travels. 
    // In travel.routes.ts it calls: travelProcessor.processTravel(travel)
    // But usually there is a worker that polls. 
    // Let's try to invoke the polling or processing logic directly.
    
    // In the analyzed code, `TravelService.js` has `processPendingTravels`.
    // Let's try to import directly from the JS file since it's a raw JS service? 
    // Note: The project seems to mix TS and JS. `services/travel.service.js` is JS.
    
    try {
        const travelP0Service = require('../dist/services/travel/travel-p0.service').travelP0Service;
        // Wait, travel-p0.service is for specific logic. 
        // The file I read earlier was `backend/src/services/travel.service.js`
        // It might be compiled to `dist/services/travel.service.js`
        
        const TravelService = require('../src/services/travel.service.js');
        
        await TravelService.processPendingTravels();
        console.log('✅ processPendingTravels executed.');
    } catch (e) {
        console.error('❌ Error executing processPendingTravels:', e);
    }

    // 4. Check result
    const updatedTravel = await prisma.travel.findUnique({
        where: { id: travelId }
    });

    console.log('\n--- Result ---');
    console.log(`Status: ${updatedTravel.status}`);
    console.log(`JournalHash: ${updatedTravel.journalHash}`);
    console.log(`SouvenirID: ${updatedTravel.souvenirId}`);
    
    await prisma.$disconnect();
}

simulateTravel().catch(console.error);
