const { ethers } = require('ethers');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ZETAFROG_ABI = require('../src/abi/ZetaFrogNFT.json');

async function grantPermissions() {
    console.log('=== Granting Travel Manager Permissions ===\n');
    
    const ZETAFROG_ADDRESS = process.env.ZETAFROG_NFT_ADDRESS;
    const RPC_URL = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/tendermint';
    const OWNER_PRIVATE_KEY = process.env.DEPLOYER_KEY || process.env.PRIVATE_KEY;
    const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
    
    if (!ZETAFROG_ADDRESS) {
        console.error('❌ ZETAFROG_NFT_ADDRESS not found in .env');
        return;
    }
    
    if (!OWNER_PRIVATE_KEY) {
        console.error('❌ Owner private key (DEPLOYER_KEY or PRIVATE_KEY) not found in .env');
        console.log('   This is needed to call setTravelManager (onlyOwner)');
        return;
    }
    
    if (!RELAYER_PRIVATE_KEY) {
        console.error('❌ RELAYER_PRIVATE_KEY not found in .env');
        return;
    }
    
    // Get addresses from private keys
    const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY);
    const relayerWallet = new ethers.Wallet(RELAYER_PRIVATE_KEY);
    
    console.log(`Contract Address: ${ZETAFROG_ADDRESS}`);
    console.log(`RPC URL: ${RPC_URL}`);
    console.log(`Owner Address: ${ownerWallet.address}`);
    console.log(`Relayer Address: ${relayerWallet.address}\n`);
    
    // Connect to network
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const ownerSigner = ownerWallet.connect(provider);
    
    // Connect to contract
    const contract = new ethers.Contract(
        ZETAFROG_ADDRESS,
        ZETAFROG_ABI,
        ownerSigner
    );
    
    try {
        // Check current travel manager
        console.log('Checking current travel manager...');
        const currentManager = await contract.travelManager();
        console.log(`Current Travel Manager: ${currentManager}\n`);
        
        if (currentManager.toLowerCase() === relayerWallet.address.toLowerCase()) {
            console.log('✅ Relayer is already the travel manager!');
            return;
        }
        
        // Set new travel manager
        console.log('Setting relayer as travel manager...');
        const tx = await contract.setTravelManager(relayerWallet.address);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log('Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
        
        // Verify
        const newManager = await contract.travelManager();
        console.log(`\nNew Travel Manager: ${newManager}`);
        
        if (newManager.toLowerCase() === relayerWallet.address.toLowerCase()) {
            console.log('\n🎉 SUCCESS! Relayer now has travel manager permissions.');
        } else {
            console.log('\n❌ Something went wrong. Manager was not updated correctly.');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
    }
}

grantPermissions().catch(console.error);
