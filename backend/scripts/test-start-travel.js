const { ethers } = require('ethers');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ZETAFROG_ABI = require('../src/abi/ZetaFrogNFT.json');

async function startOnChainTravel() {
    console.log('=== Starting On-Chain Travel for Testing ===\n');
    
    const ZETAFROG_ADDRESS = process.env.ZETAFROG_NFT_ADDRESS;
    const RPC_URL = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/tendermint';
    const PRIVATE_KEY = process.env.DEPLOYER_KEY || process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(ZETAFROG_ADDRESS, ZETAFROG_ABI, wallet);
    
    try {
        const frogId = 1; // Testing with frog 1
        console.log(`Using Frog ID: ${frogId}`);
        console.log(`Signer Address: ${wallet.address}`);
        
        const ownerOfFrog = await contract.ownerOf(frogId);
        console.log(`Frog Owner: ${ownerOfFrog}`);
        
        if (ownerOfFrog.toLowerCase() !== wallet.address.toLowerCase()) {
            console.error('❌ Signer is NOT the owner of this frog. Cannot start travel.');
            return;
        }
        
        const frog = await contract.getFrog(frogId);
        if (frog.status == 1) {
            console.log('Frog is already traveling on-chain.');
        } else {
            console.log('Starting travel on-chain...');
            // tokenId, targetWallet, duration, targetChainId
            const tx = await contract.startTravel(
                frogId,
                "0x0000000000000000000000000000000000000000",
                60, // 1 minute
                7001 // ZetaChain
            );
            console.log(`Transaction sent: ${tx.hash}`);
            await tx.wait();
            console.log('✅ Travel started on-chain!');
        }
        
        // Final check
        const newStatus = await contract.getFrog(frogId);
        console.log(`Current On-Chain Status: ${newStatus.status == 0 ? 'Idle' : 'Traveling'}`);
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

startOnChainTravel().catch(console.error);
