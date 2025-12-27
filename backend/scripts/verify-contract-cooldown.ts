
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import path from 'path';


// Define minimal ABI
const ZETAFROG_ABI = [
  "function mintFrog(string name) external returns (uint256)",
  "function startTravel(uint256 tokenId, address targetWallet, uint256 duration, uint256 targetChainId) external",
  "function completeTravel(uint256 tokenId, string memory journalHash, uint256 souvenirId) external",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)"
];

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyContractCooldown() {
  console.log('--- Verifying Contract Cooldown (On-Chain) ---');

  const rpcUrl = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public';
  const privateKey = process.env.RELAYER_PRIVATE_KEY || process.env.BACKEND_PRIVATE_KEY;
  const contractAddress = process.env.ZETAFROG_NFT_ADDRESS || '0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff';

  if (!privateKey) {
    console.error('❌ No private key found in .env');
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`Using wallet: ${wallet.address}`);
  console.log(`Contract: ${contractAddress}`);

  const contract = new ethers.Contract(contractAddress, ZETAFROG_ABI, wallet);

  // 1. Mint a frog (if needed) or pick one we own
  // Since it's a new contract, we likely own 0 if we deployed it with a different key, 
  // OR if we are the minter we can mint one.
  // The deploy script set Minter to Deployer. If RELAYER_KEY == Deployer Key, we are good.
  // Let's try to mint.
  
  const frogName = `Tester-${Date.now()}`;
  console.log(`Minting frog: ${frogName}...`);
  try {
      const mintTx = await contract.mintFrog(frogName);
      console.log(`Mint tx sent: ${mintTx.hash}`);
      const receipt = await mintTx.wait();
      // Find TokenID from event
      const event = receipt.logs.find((l: any) => l.topics[0] === ethers.id("FrogMinted(address,uint256,string,uint256)"));
      // Parsing log is hard without interface, let's assume it's the last token of owner
  } catch (e: any) {
      console.log('Minting failed:', e);
      // console.log('Minting failed (maybe not minter?), trying to use existing frog...');
  }

  // Get first token of owner
  const balance = await contract.balanceOf(wallet.address);
  console.log(`Wallet Balance: ${balance} frogs`);

  if (balance == 0) {
      console.error('❌ No frogs owned. Cannot test cooldown.');
      return;
  }

  // Get token ID (naive assumption: 0 or iterate)
  // ERC721Enumerable not used? ZETAFROG_ABI has generic ERC721 methods but not tokenOfOwnerByIndex usually unless extension used.
  // ZetaFrogNFT inherits ERC721URIStorage.
  // Let's trying scanning IDs 1 to 10.
  
  let tokenId = -1;
  for(let i=1; i<=20; i++) {
      try {
          const owner = await contract.ownerOf(i);
          if (owner === wallet.address) {
              tokenId = i;
              break;
          }
      } catch (e) {}
  }

  if (tokenId === -1) {
       console.error('❌ Could not find a token owned by wallet.');
       return;
  }

  console.log(`Using Token ID: ${tokenId}`);

  // 2. Start Travel 1
  console.log('Starting Travel 1 (On-Chain)...');
  try {
    // startTravel(uint256 tokenId, address targetWallet, uint256 duration, uint256 targetChainId)
    // Use valid duration (e.g. 60s)
    const tx1 = await contract.startTravel(tokenId, wallet.address, 60, 7001);
    console.log(`Travel 1 tx: ${tx1.hash}`);
    await tx1.wait();
    console.log('✅ Travel 1 confirmed.');
  } catch (e: any) {
    if (e.message.includes("Frog is busy")) {
        console.log('Frog is busy, trying to cancel/complete first? Or just skip.');
        // If busy, we can't test "Start -> Start" sequence easily without completing it.
    } else {
        console.error(`Travel 1 failed: ${e.message}`);
        return;
    }
  }

  // 3. Try Start Travel 2 immediately (Should FAIL due to status BUSY or Cooldown?)
  // Wait, if we just started, status is Traveling. We can't start again until we complete/cancel.
  // So we must COMPLETE the travel first to trigger the cooldown check on the NEXT start.
  // But wait, Cooldown is usually "after travel ends".
  // Contract: 
  // completeTravel sets lastTravelEnd = block.timestamp.
  // startTravel checks block.timestamp >= lastTravelEnd + COOLDOWN.
  
  // So steps:
  // - Start Travel
  // - Complete Travel (requires minter/manager role?)
  // - Start Travel AGAIN (Check Cooldown)

  // Does this wallet have permission to complete? 
  // Deploy log: "Minter: BACKEND_SERVICE_ADDRESS".
  // If wallet == backend service, yes.
  
  console.log('Completing Travel 1...');
  try {
      // completeTravel(uint256 tokenId, string memory journalHash, uint256 souvenirId)
      const txComp = await contract.completeTravel(tokenId, "hash", 0);
      await txComp.wait();
      console.log('✅ Travel 1 completed.');
  } catch (e: any) {
      console.error(`Completion failed: ${e.message}`);
      return;
  }

  // 4. Now Cooldown is active (starts from now).
  // Try Start Travel 2 immediately.
  console.log('Attempting Travel 2 (Should FAIL - Cooldown active)...');
  try {
      const tx2 = await contract.startTravel(tokenId, wallet.address, 60, 7001);
      await tx2.wait();
      console.error('❌ Travel 2 started unexpectedly!');
  } catch (e: any) {
      console.log(`✅ Expected Failure: ${e.message}`);
      // Ethers usually throws "execution reverted"
  }

  // 5. Wait 65s
  console.log('Waiting 65s for cooldown...');
  await new Promise(resolve => setTimeout(resolve, 65000));

  // 6. Try Travel 3
  console.log('Attempting Travel 3 (Should SUCCEED)...');
  try {
      const tx3 = await contract.startTravel(tokenId, wallet.address, 60, 7001);
      await tx3.wait();
      console.log('✅ Travel 3 started successfully.');
  } catch (e: any) {
      console.error(`❌ Travel 3 failed: ${e.message}`);
  }

}

verifyContractCooldown().catch(console.error);
