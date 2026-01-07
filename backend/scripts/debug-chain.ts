
import { createPublicClient, http, defineChain } from 'viem';
import dotenv from 'dotenv';
import path from 'path';

// 加载 .env
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
    console.log('--- Debug Chain Connection ---');
    
    const rpcUrl = process.env.ZETACHAIN_RPC_URL;
    const contractAddress = process.env.ZETAFROG_NFT_ADDRESS;
    const chainId = process.env.CHAIN_ID;

    console.log(`RPC URL: ${rpcUrl}`);
    console.log(`Contract: ${contractAddress}`);
    console.log(`Chain ID (env): ${chainId}`);

    if (!rpcUrl) {
        console.error('Error: ZETACHAIN_RPC_URL is missing');
        return;
    }

    try {
        const client = createPublicClient({
            transport: http(rpcUrl),
        });

        console.log('Connecting to chain...');
        const blockNumber = await client.getBlockNumber();
        console.log(`Current Block Number: ${blockNumber}`);
        
        const chainIdFromChain = await client.getChainId();
        console.log(`Chain ID (network): ${chainIdFromChain}`);

        if (blockNumber > 1000000n) {
            console.warn('⚠️  WARNING: Block height is very high! You are likely connected to a Public Testnet, NOT Localhost.');
        } else {
            console.log('✅ Block height is low. Looks like Localhost.');
        }

        if (chainIdFromChain.toString() !== '31337') {
             console.warn(`⚠️  WARNING: Chain ID is ${chainIdFromChain}, expected 31337 for Localhost.`);
        } else {
            console.log('✅ Chain ID matches Localhost (31337).');
        }

    } catch (error) {
        console.error('❌ Connection Failed:', error);
    }
}

main();
