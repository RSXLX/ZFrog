
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

const zetachainAthens = defineChain({
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
    rpcUrls: { default: { http: ['https://zetachain-athens.g.allthatnode.com/archive/evm'] } },
});

const candidates = {
    'ZetaFrog (Frontend Env)': '0x8460344d5435D08CaBAE2f1157D355209cb9E7cF',
    'ZetaFrog (Log)': '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
    'Souvenir (Frontend Env/Slot16)': '0x78E7E59Cab2a14ce9aA82A29953359A2f5a93662',
    'Souvenir (Log)': '0x9A676e781A523b5d0C0e43731313A708CB607508',
    'Travel (Log)': '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82',
    'Backend Service (Env)': '0x53C1844Af058fE3B3195e49fEC8f97E0a4F87772'
};

async function main() {
    console.log('--- Checking Contract Existence on ZetaChain Athens ---');
    
    const client = createPublicClient({
        chain: zetachainAthens,
        transport: http(),
    });

    for (const [label, address] of Object.entries(candidates)) {
        try {
            const code = await client.getBytecode({ address: address as `0x${string}` });
            const exists = code && code.length > 2;
            const len = exists ? code.length : 0;
            console.log(`[${exists ? '✅' : '❌'}] ${label}: ${address} (Len: ${len})`);
        } catch (e) {
            console.log(`[?] ${label}: ${address} (Error: ${e.message})`);
        }
    }
}

main();
