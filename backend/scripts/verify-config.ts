
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ZETACHAIN_RPC = process.env.ZETACHAIN_RPC_URL || 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public';
const ZETAFROG_ADDRESS = process.env.ZETAFROG_NFT_ADDRESS as `0x${string}`;

const zetachainAthens = defineChain({
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'ZETA',
        symbol: 'ZETA'
    },
    rpcUrls: {
        default: { http: [ZETACHAIN_RPC] },
    },
});

async function checkConfig() {
    console.log('--- Configuration Check ---');
    console.log(`RPC URL: ${ZETACHAIN_RPC}`);
    console.log(`Frog Contract: ${ZETAFROG_ADDRESS}`);
    console.log(`Private Key Present: ${!!process.env.BACKEND_PRIVATE_KEY}`);
    console.log(`Pinata Key Present: ${!!process.env.PINATA_API_KEY}`);
    console.log(`Qwen Key Present: ${!!process.env.QWEN_API_KEY}`);

    const client = createPublicClient({
        chain: zetachainAthens,
        transport: http(ZETACHAIN_RPC),
    });
    
    try {
        console.log('\n--- Network Check ---');
        const blockNumber = await client.getBlockNumber();
        console.log(`✅ Connected to ZetaChain. Current Block: ${blockNumber}`);
    } catch (e: any) {
        console.error('❌ Failed to connect to ZetaChain:', e.message);
    }

    if (ZETAFROG_ADDRESS) {
        try {
             const code = await client.getBytecode({ address: ZETAFROG_ADDRESS });
             if (!code) {
                 console.error('❌ Contract code NOT found at ZETAFROG_ADDRESS on this chain');
             } else {
                 console.log('✅ Contract code found at ZETAFROG_ADDRESS');
             }
        } catch (e: any) {
            console.error('❌ Failed to check contract code:', e.message);
        }
    } else {
        console.error('❌ ZETAFROG_NFT_ADDRESS is missing');
    }

    console.log('\n--- Database Check ---');
    const prisma = new PrismaClient();
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
        const frogCount = await prisma.frog.count();
        console.log(`Found ${frogCount} frogs in DB`);
    } catch (e: any) {
        console.error('❌ Database connection failed:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkConfig().catch(console.error);
