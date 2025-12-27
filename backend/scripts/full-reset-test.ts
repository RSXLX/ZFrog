
import { PrismaClient, FrogStatus } from '@prisma/client';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Define minimal ABI
const ZETAFROG_ABI = [
  "function mintFrog(string name) external returns (uint256)",
  "function startTravel(uint256 tokenId, address targetWallet, uint256 duration, uint256 targetChainId) external",
  "function completeTravel(uint256 tokenId, string memory journalHash, uint256 souvenirId) external",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)"
];

const prisma = new PrismaClient();

async function fullResetAndTest() {
  console.log('🚀 Starting Full Reset and Verification...');

  // 1. Clean Database
  console.log('\n🧹 Cleaning Database...');
  
  // Children of Travel
  await prisma.walletObservation.deleteMany({});
  await prisma.travelStatusMessage.deleteMany({});
  
  // Travelers
  await prisma.travel.deleteMany({});
  
  // Children of Frog
  await prisma.frogTravelStats.deleteMany({});
  await prisma.souvenir.deleteMany({}); 
  await prisma.friendInteraction.deleteMany({});
  await prisma.friendship.deleteMany({});
  await prisma.userBadge.deleteMany({});
  
  // Chat
  await prisma.chatMessage.deleteMany({});
  await prisma.chatSession.deleteMany({});
  
  // Finally Frog
  await prisma.frog.deleteMany({});
  
  console.log('✅ Database cleaned.');

  // 2. Setup Wallet & Contract
  const rpcUrl = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public';
  const privateKey = process.env.RELAYER_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY;
  const contractAddress = process.env.ZETAFROG_NFT_ADDRESS;

  if (!privateKey || !contractAddress) {
    console.error('❌ Missing config: KEY or ADDRESS');
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`\n💳 Wallet: ${wallet.address}`);
  console.log(`📝 Contract: ${contractAddress}`);

  const contract = new ethers.Contract(contractAddress, ZETAFROG_ABI, wallet);

  // 3. Mint Frog
  const frogName = `ResetFrog-${Math.floor(Math.random()*1000)}`;
  console.log(`\n🐸 Minting new frog: ${frogName}...`);
  
  let tokenId: number | null = null;

  try {
    const tx = await contract.mintFrog(frogName);
    console.log(`   Tx Hash: ${tx.hash}`);
    const receipt = await tx.wait();
    
    // Find TokenID
    const iface = new ethers.Interface(ZETAFROG_ABI);
    const log = receipt.logs.find((l: any) => {
        try {
            return iface.parseLog(l)?.name === 'FrogMinted';
        } catch { return false; }
    });
    
    if (log) {
        const parsed = iface.parseLog(log);
        tokenId = Number(parsed?.args.tokenId);
        console.log(`   ✅ Minted TokenID: ${tokenId}`);
    } else {
        console.log('   ⚠️ Could not parse FrogMinted event correctly.');
    }
  } catch (error: any) {
    console.error(`   ❌ Minting failed: ${error.message}`);
    return;
  }

  if (tokenId === null) return;

  // 4. Manual Sync to DB (Simulating Listener)
  console.log(`\n🔄 Syncing Frog ${tokenId} to Database...`);
  
  const frog = await prisma.frog.create({
      data: {
          tokenId: tokenId,
          name: frogName,
          ownerAddress: wallet.address.toLowerCase(),
          status: FrogStatus.Idle,
          birthday: new Date(),
      }
  });
  console.log(`✅ Frog synced to DB: ID ${frog.id}`);

  // 5. Run Cooldown Verification
  console.log('\n⏱️ Running Cooldown Verification (1 min)...');
  
  // Start Travel 1
  console.log('   ▶️ (T=0s) Starting Travel 1 (60s duration)...');
  try {
      // Contract Start
      const tx1 = await contract.startTravel(tokenId, wallet.address, 60, 7001);
      await tx1.wait();
      console.log('   ✅ Travel 1 Started On-Chain.');
      
      // Update DB Status
      await prisma.travel.create({
          data: {
              frogId: frog.id,
              targetWallet: wallet.address,
              chainId: 7001,
              status: 'Active',
              startTime: new Date(),
              endTime: new Date(Date.now() + 60000),
              isRandom: true
          }
      });
      await prisma.frog.update({where:{id:frog.id}, data:{status:'Traveling'}});

  } catch (e: any) {
      console.error(`   ❌ Travel 1 Failed: ${e.message}`);
      return;
  }

  // Complete Travel 1
  console.log('   Completing Travel 1 (to set cooldown timer)...');
  try {
      const txComp = await contract.completeTravel(tokenId, "mock_hash", 0);
      await txComp.wait();
      console.log('   ✅ Travel 1 Completed On-Chain.');
      
      await prisma.travel.updateMany({where:{frogId:frog.id, status:'Active'}, data:{status:'Completed'}});
      await prisma.frog.update({where:{id:frog.id}, data:{status:'Idle'}});
  } catch (e: any) {
      console.error(`   ❌ Completion Failed: ${e.message}`);
      return;
  }

  // Attempt Travel 2 (Immediate - Should Fail)
  console.log('\n   ▶️ (T=15s) Attempting Travel 2 (Should FAIL)...');
  try {
      const tx2 = await contract.startTravel(tokenId, wallet.address, 60, 7001);
      await tx2.wait();
      console.error('   ❌ Travel 2 Started Unexpectedly! Cooldown broken?');
  } catch (e: any) {
      console.log(`   ✅ Expected Failure: ${e.message}`); // "Still in cooldown"
  }

  // Wait for Cooldown
  // Wait slightly more than 60s from completion. 
  console.log('\n   ⏳ Waiting 65 seconds...');
  await new Promise(r => setTimeout(r, 65000));

  // Attempt Travel 3 (Success)
  console.log('\n   ▶️ (T=80s) Attempting Travel 3 (Should SUCCEED)...');
  try {
      const tx3 = await contract.startTravel(tokenId, wallet.address, 60, 7001);
      await tx3.wait();
      console.log('   ✅ Travel 3 Started Successfully!');
  } catch (e: any) {
      console.error(`   ❌ Travel 3 Failed: ${e.message}`);
  }

  console.log('\n🎉 Verification Complete.');
  await prisma.$disconnect();
}

fullResetAndTest().catch(console.error);
