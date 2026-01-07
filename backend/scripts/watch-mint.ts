
import { createPublicClient, http, parseAbiItem, defineChain } from 'viem';
import dotenv from 'dotenv';
import path from 'path';

// 加载 .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const localChain = defineChain({
    id: 31337,
    name: 'Localhost',
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
});

async function main() {
    console.log('--- 🐸 Frog Mint Watcher (Localhost) ---');
    
    const rpcUrl = process.env.ZETACHAIN_RPC_URL || 'http://127.0.0.1:8545/';
    const contractAddress = process.env.ZETAFROG_NFT_ADDRESS as `0x${string}`;

    console.log(`RPC: ${rpcUrl}`);
    console.log(`Target Contract: ${contractAddress}`);
    console.log('Listening for "FrogMinted" events...');

    if (!contractAddress) {
        console.error('❌ Contract address missing in .env');
        return;
    }

    const client = createPublicClient({
        chain: localChain,
        transport: http(rpcUrl),
    });

    try {
        // Watch for events
        const unwatch = client.watchEvent({
            address: contractAddress,
            event: parseAbiItem('event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)'),
            onLogs: (logs) => {
                for (const log of logs) {
                    const { owner, tokenId, name } = log.args;
                    console.log(`\n🎉 NEW MINT DETECTED!`);
                    console.log(`Token ID: ${tokenId}`);
                    console.log(`Name: ${name}`);
                    console.log(`Owner: ${owner}`);
                    console.log(`Tx Hash: ${log.transactionHash}`);
                    console.log('----------------------------------------');
                }
            }
        });

        // Keep process alive
        await new Promise(() => {});

    } catch (error) {
        console.error('Error in watcher:', error);
    }
}

main();
