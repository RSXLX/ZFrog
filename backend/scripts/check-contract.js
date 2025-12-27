const { ethers } = require('ethers');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ZETAFROG_ABI = require('../src/abi/ZetaFrogNFT.json');

async function checkOwner() {
    console.log('=== Contract Authority Check ===\n');
    
    const ZETAFROG_ADDRESS = process.env.ZETAFROG_NFT_ADDRESS;
    const RPC_URL = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/tendermint';
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(ZETAFROG_ADDRESS, ZETAFROG_ABI, provider);
    
    try {
        const owner = await contract.owner();
        const manager = await contract.travelManager();
        
        console.log(`Contract: ${ZETAFROG_ADDRESS}`);
        console.log(`Owner:    ${owner}`);
        console.log(`Manager:  ${manager}`);
        
        const relayerKey = process.env.RELAYER_PRIVATE_KEY;
        if (relayerKey) {
            const relayerAddr = new ethers.Wallet(relayerKey).address;
            console.log(`Relayer:  ${relayerAddr}`);
            
            if (relayerAddr.toLowerCase() === owner.toLowerCase()) {
                console.log('\n✅ Relayer IS the owner of the contract.');
            } else {
                console.log('\n❌ Relayer is NOT the owner.');
            }
            
            if (relayerAddr.toLowerCase() === manager.toLowerCase()) {
                console.log('✅ Relayer IS already the travel manager.');
            } else {
                console.log('❌ Relayer is NOT the travel manager.');
            }
        }

        console.log('\n--- Frog Status Check ---');
        for (let i = 0; i < 5; i++) {
            try {
                const frog = await contract.getFrog(i);
                const travel = await contract.getActiveTravel(i);
                console.log(`Frog ${i}: Status=${frog.status == 0 ? 'Idle' : 'Traveling'}, XP=${frog.xp}`);
                if (frog.status == 1) {
                    console.log(`   Traveling to ${travel.targetWallet} on chain ${travel.targetChainId}`);
                    console.log(`   Ends at: ${new Date(Number(travel.endTime) * 1000).toLocaleString()}`);
                }
            } catch (e) {
                // Skip if frog doesn't exist
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkOwner().catch(console.error);
