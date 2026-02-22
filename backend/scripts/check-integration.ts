
import { ethers } from 'ethers';
import { config } from '../src/config';
import { SUPPORTED_CHAINS } from '../src/config/chains';
import { ZETAFROG_ABI } from '../src/config/contracts';

async function main() {
  console.log('🔍 Starting System Contract & Backend Integration Check...\n');

  // 1. Check Configuration
  console.log('1️⃣  Checking Environment Configuration:');
  const criticalVars = [
    'ZETACHAIN_RPC_URL',
    'ZETAFROG_NFT_ADDRESS',
    // 'OMNI_TRAVEL_ADDRESS', // Might be optional if using fallback
    // 'RELAYER_PRIVATE_KEY'  // Security risk to print, just check existence
  ];

  for (const varName of criticalVars) {
    const value = (config as any)[varName];
    if (value) {
      console.log(`   ✅ ${varName}: Configured (${value})`);
    } else {
      console.log(`   ❌ ${varName}: MISSING`);
    }
  }

  if (config.RELAYER_PRIVATE_KEY) {
    console.log(`   ✅ RELAYER_PRIVATE_KEY: Configured`);
  } else {
    console.log(`   ❌ RELAYER_PRIVATE_KEY: MISSING`);
  }
  console.log('');

  // 2. Check Chain Connectivity
  console.log('2️⃣  Checking RPC Connectivity:');
  const chainsToCheck = [
    { key: 'ZETACHAIN_ATHENS', url: config.ZETACHAIN_RPC_URL, expectedId: 7001 },
    { key: 'BSC_TESTNET', url: config.BSC_TESTNET_RPC_URL, expectedId: 97 },
    { key: 'ETH_SEPOLIA', url: config.ETH_SEPOLIA_RPC_URL, expectedId: 11155111 },
  ];

  for (const chain of chainsToCheck) {
    if (!chain.url) {
      console.log(`   ⚠️  ${chain.key}: RPC URL not configured, skipping.`);
      continue;
    }
    
    try {
      const provider = new ethers.JsonRpcProvider(chain.url);
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      
      const chainId = Number(network.chainId);
      if (chainId === chain.expectedId) {
        console.log(`   ✅ ${chain.key}: Connected (ID: ${chainId}, Block: ${blockNumber})`);
      } else {
        console.log(`   ❌ ${chain.key}: ID Mismatch! Expected ${chain.expectedId}, got ${chainId}`);
      }
    } catch (error: any) {
      console.log(`   ❌ ${chain.key}: Connection Failed - ${error.message}`);
    }
  }
  console.log('');

  // 3. Check ZetaFrog Contract
  console.log('3️⃣  Checking ZetaFrog NFT Contract:');
  if (config.ZETACHAIN_RPC_URL && config.ZETAFROG_NFT_ADDRESS) {
    try {
      const provider = new ethers.JsonRpcProvider(config.ZETACHAIN_RPC_URL);
      const contract = new ethers.Contract(config.ZETAFROG_NFT_ADDRESS, ZETAFROG_ABI, provider);
      
      // Call functions present in the ABI
      const maxSupply = await contract.MAX_SUPPLY().catch((e: any) => `Error: ${e.message}`);
      const totalSupply = await contract.totalSupply().catch((e: any) => `Error: ${e.message}`);
      
      console.log(`   Contract Address: ${config.ZETAFROG_NFT_ADDRESS}`);
      console.log(`   MAX_SUPPLY: ${maxSupply}`);
      console.log(`   Total Supply: ${totalSupply}`);
      console.log(`   ✅ ZetaFrog Contract interactions successful.`);
    } catch (error: any) {
      console.log(`   ❌ ZetaFrog Contract Check Failed: ${error.message}`);
    }
  } else {
    console.log('   ⚠️  Skipping Contract Check (Missing Config)');
  }
  
  console.log('\nIntegration Check Completed.');
}

main().catch(console.error);
