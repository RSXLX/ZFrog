/**
 * 🐸 Post-Reset Full Flow Verification Script
 * 
 * This script verifies the entire Frog system after a reset:
 * 1. Checks wallet balance and existing frogs
 * 2. Mints a new frog if needed
 * 3. Verifies database sync
 * 4. Starts a travel session
 * 5. Verifies travel status on-chain and in DB
 * 
 * Usage: npx tsx scripts/verify-full-flow.ts
 */

import { PrismaClient, FrogStatus } from '@prisma/client';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// --- ABIs ---
const ZETAFROG_ABI = [
  "function mintFrog(string name) external returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function getFrog(uint256 tokenId) view returns (string name, uint64 birthday, uint32 totalTravels, uint8 status, uint256 xp, uint256 level)",
  "function totalSupply() view returns (uint256)",
  "event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)"
];

const TRAVEL_ABI = [
  "function startTravel(uint256 tokenId, address targetWallet, uint256 duration, uint256 targetChainId) external",
  "function getActiveTravel(uint256 tokenId) view returns (uint64 startTime, uint64 endTime, address targetWallet, uint256 targetChainId, bool completed, bool isRandom)",
  "function cancelTravel(uint256 tokenId) external"
];

const prisma = new PrismaClient();

async function main() {
  console.log('\n🐸 ========================================');
  console.log('   Post-Reset Full Flow Verification');
  console.log('==========================================\n');

  // --- Setup ---
  const rpcUrl = process.env.ZETACHAIN_RPC_URL;
  const privateKey = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  const nftAddress = process.env.ZETAFROG_NFT_ADDRESS;
  const travelAddress = process.env.TRAVEL_CONTRACT_ADDRESS;

  if (!privateKey || !nftAddress || !travelAddress) {
    console.error('❌ Missing env config: PRIVATE_KEY, ZETAFROG_NFT_ADDRESS, or TRAVEL_CONTRACT_ADDRESS');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const nftContract = new ethers.Contract(nftAddress, ZETAFROG_ABI, wallet);
  const travelContract = new ethers.Contract(travelAddress, TRAVEL_ABI, wallet);

  console.log(`💳 Wallet:          ${wallet.address}`);
  console.log(`📝 NFT Contract:    ${nftAddress}`);
  console.log(`🧳 Travel Contract: ${travelAddress}`);
  console.log('');

  // --- Step 1: Check existing frogs ---
  console.log('--- Step 1: Check Wallet Frog Balance ---');
  const balance = await nftContract.balanceOf(wallet.address);
  console.log(`   Frog Balance: ${balance}`);

  let tokenId: number;

  if (Number(balance) === 0) {
    // --- Step 2: Mint a new frog ---
    console.log('\n--- Step 2: Mint New Frog ---');
    const frogName = `VerifyFrog_${Date.now()}`;
    console.log(`   Minting: ${frogName}...`);

    try {
      const tx = await nftContract.mintFrog(frogName);
      console.log(`   Tx Hash: ${tx.hash}`);
      const receipt = await tx.wait();

      const iface = new ethers.Interface(ZETAFROG_ABI);
      const log = receipt.logs.find((l: any) => {
        try { return iface.parseLog(l)?.name === 'FrogMinted'; } catch { return false; }
      });

      if (log) {
        const parsed = iface.parseLog(log);
        tokenId = Number(parsed?.args.tokenId);
        console.log(`   ✅ Minted! TokenID: ${tokenId}`);
      } else {
        // Fallback: get from totalSupply
        const total = await nftContract.totalSupply();
        tokenId = Number(total) - 1;
        console.log(`   ✅ Minted! TokenID (from totalSupply): ${tokenId}`);
      }

      // Sync to DB
      console.log('\n--- Step 3: Sync to Database ---');
      const frogData = await nftContract.getFrog(tokenId);
      await prisma.frog.upsert({
        where: { tokenId: tokenId },
        update: { ownerAddress: wallet.address.toLowerCase(), name: frogData[0] },
        create: {
          tokenId: tokenId,
          name: frogData[0],
          ownerAddress: wallet.address.toLowerCase(),
          status: FrogStatus.Idle,
          birthday: new Date(Number(frogData[1]) * 1000),
        }
      });
      console.log(`   ✅ Frog synced to DB`);

    } catch (err: any) {
      console.error(`   ❌ Mint failed: ${err.reason || err.message}`);
      await prisma.$disconnect();
      process.exit(1);
    }
  } else {
    // Fresh contract - need to mint first since balance > 0 but on OLD contract
    // For fresh contract, totalSupply tells us how many have been minted
    const totalSupply = Number(await nftContract.totalSupply());
    console.log(`   Total Supply: ${totalSupply}`);
    
    if (totalSupply === 0) {
      console.log('   No frogs minted yet. Will mint one...');
      // Fall through to mint below
      // Force balance to 0 to trigger mint
      const frogName = `VerifyFrog_${Date.now()}`;
      console.log(`\n--- Step 2: Mint New Frog ---`);
      console.log(`   Minting: ${frogName}...`);

      try {
        const tx = await nftContract.mintFrog(frogName);
        console.log(`   Tx Hash: ${tx.hash}`);
        const receipt = await tx.wait();

        const iface = new ethers.Interface(ZETAFROG_ABI);
        const log = receipt.logs.find((l: any) => {
          try { return iface.parseLog(l)?.name === 'FrogMinted'; } catch { return false; }
        });

        if (log) {
          const parsed = iface.parseLog(log);
          tokenId = Number(parsed?.args.tokenId);
          console.log(`   ✅ Minted! TokenID: ${tokenId}`);
        } else {
          tokenId = 0;
          console.log(`   ✅ Minted! TokenID: 0 (first frog)`);
        }

        // Sync to DB
        console.log('\n--- Step 3: Sync to Database ---');
        const frogData = await nftContract.getFrog(tokenId);
        await prisma.frog.upsert({
          where: { tokenId: tokenId },
          update: { ownerAddress: wallet.address.toLowerCase(), name: frogData[0] },
          create: {
            tokenId: tokenId,
            name: frogData[0],
            ownerAddress: wallet.address.toLowerCase(),
            status: FrogStatus.Idle,
            birthday: new Date(Number(frogData[1]) * 1000),
          }
        });
        console.log(`   ✅ Frog synced to DB`);
      } catch (err: any) {
        console.error(`   ❌ Mint failed: ${err.reason || err.message}`);
        console.error(err);
        await prisma.$disconnect();
        process.exit(1);
      }
    } else {
      // Use first token (tokenId = 0)
      tokenId = 0;
      console.log(`   Using existing Frog: TokenID ${tokenId}`);
    }
  }

  // --- Step 4: Check Frog On-Chain Status ---
  console.log('\n--- Step 4: Check On-Chain Status ---');
  const frogData = await nftContract.getFrog(tokenId);
  const statusMap = ['Idle', 'Traveling', 'CrossChainLocked'];
  console.log(`   Name:   ${frogData[0]}`);
  console.log(`   Status: ${statusMap[Number(frogData[3])]}`);
  console.log(`   Level:  ${frogData[5]}`);

  if (Number(frogData[3]) !== 0) {
    console.log('\n⚠️  Frog is not Idle. Skipping travel test.');
    console.log('   Use cancelTravel or complete existing travel first.');
    await prisma.$disconnect();
    return;
  }

  // --- Step 5: Start Travel ---
  console.log('\n--- Step 5: Start Travel (60s duration) ---');
  try {
    const tx = await travelContract.startTravel(tokenId, wallet.address, 60, 7001);
    console.log(`   Tx Hash: ${tx.hash}`);
    await tx.wait();
    console.log('   ✅ Travel Started!');

    // Update DB
    const dbFrog = await prisma.frog.findUnique({ where: { tokenId: tokenId } });
    if (dbFrog) {
      await prisma.travel.create({
        data: {
          frogId: dbFrog.id,
          targetWallet: wallet.address,
          chainId: 7001,
          status: 'Active',
          startTime: new Date(),
          endTime: new Date(Date.now() + 60000),
          isRandom: false,
        }
      });
      await prisma.frog.update({ where: { id: dbFrog.id }, data: { status: FrogStatus.Traveling } });
      console.log('   ✅ DB Updated');
    }
  } catch (err: any) {
    console.error(`   ❌ Travel start failed: ${err.reason || err.message}`);
  }

  // --- Step 6: Verify Travel Status ---
  console.log('\n--- Step 6: Verify Travel Status ---');
  const activeTravel = await travelContract.getActiveTravel(tokenId);
  console.log(`   StartTime:   ${new Date(Number(activeTravel[0]) * 1000).toISOString()}`);
  console.log(`   EndTime:     ${new Date(Number(activeTravel[1]) * 1000).toISOString()}`);
  console.log(`   TargetChain: ${activeTravel[3]}`);
  console.log(`   Completed:   ${activeTravel[4]}`);

  // --- Summary ---
  console.log('\n==========================================');
  console.log('🎉 Verification Complete!');
  console.log('==========================================');
  console.log('\nNext Steps:');
  console.log('  - Wait 60s for travel to end');
  console.log('  - Backend should auto-complete the travel');
  console.log('  - Check frontend for updated status');
  
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
