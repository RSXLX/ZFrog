
import { createPublicClient, http, parseAbi, toHex } from 'viem';
import { defineChain } from 'viem';

const zetachainAthens = defineChain({
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
    rpcUrls: { default: { http: ['https://zetachain-athens.g.allthatnode.com/archive/evm'] } },
});

const ZETAFROG_ADDRESS = '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0';

const ABI = parseAbi([
    'function souvenirNFT() view returns (address)',
    'function travelManager() view returns (address)',
]);

async function main() {
    console.log(`Checking ZetaFrog at ${ZETAFROG_ADDRESS}...`);

    const client = createPublicClient({
        chain: zetachainAthens,
        transport: http(),
    });

    try {
        // 1. Try public getters from ABI
        try {
            const souvenir = await client.readContract({
                address: ZETAFROG_ADDRESS,
                abi: ABI,
                functionName: 'souvenirNFT',
            });
            console.log(`✅ SouvenirNFT (from ABI): ${souvenir}`);
        } catch (e) {
            console.log('Could not read souvenirNFT from ABI');
        }

        try {
            const manager = await client.readContract({
                address: ZETAFROG_ADDRESS,
                abi: ABI,
                functionName: 'travelManager',
            });
            console.log(`✅ TravelManager (from ABI): ${manager}`);
        } catch (e) {
            console.log('Could not read travelManager from ABI');
        }

        // 2. Scan Storage Slots for Travel Address
        console.log('\n--- Scanning Storage Slots 0-20 ---');
        for (let i = 0; i < 20; i++) {
            const slotVal = await client.getStorageAt({
                address: ZETAFROG_ADDRESS,
                slot: toHex(i),
            });
            
            // Basic address detection (last 20 bytes)
            if (slotVal && slotVal !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
               const addressCandidate = '0x' + slotVal.slice(-40);
               
               // Check if it's a contract
               const code = await client.getBytecode({ address: addressCandidate as `0x${string}` });
               const isContract = code && code.length > 2;
               
               console.log(`Slot ${i}: ${addressCandidate} [Contract: ${isContract}]`);
            }
        }

    } catch (error: any) {
        console.error('❌ Error:', error.message || error);
    }
}

main();
