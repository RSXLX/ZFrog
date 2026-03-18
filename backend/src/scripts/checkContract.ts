import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config';
import { TRAVEL_ABI, ZETAFROG_ABI } from '../config/contracts';

const zetachainAthens = {
    id: 7001,
    name: 'ZetaChain Athens Testnet',
    nativeCurrency: {
        name: 'ZETA',
        symbol: 'ZETA',
        decimals: 18
    },
    rpcUrls: {
        default: { http: [config.ZETACHAIN_RPC_URL] },
    },
};

async function checkContract() {
    const publicClient = createPublicClient({
        chain: zetachainAthens,
        transport: http(config.ZETACHAIN_RPC_URL),
    });

    const privateKey = config.RELAYER_PRIVATE_KEY || config.PRIVATE_KEY;
    if (!privateKey) {
        console.error('Missing RELAYER_PRIVATE_KEY or PRIVATE_KEY in environment');
        return;
    }

    if (!config.ZETAFROG_NFT_ADDRESS || !config.TRAVEL_CONTRACT_ADDRESS) {
        console.error('Missing ZETAFROG_NFT_ADDRESS or TRAVEL_CONTRACT_ADDRESS');
        return;
    }

    let normalizedKey = privateKey;
    if (!normalizedKey.startsWith('0x')) {
        normalizedKey = `0x${normalizedKey}`;
    }

    try {
        const account = privateKeyToAccount(normalizedKey as `0x${string}`);
        console.log(`Relayer account: ${account.address}`);

        const [nftOwner, nftTravelContract, nftOmniTravelContract, travelManager] = await Promise.all([
            publicClient.readContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'owner',
            }),
            publicClient.readContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'travelContract',
            }),
            publicClient.readContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'omniTravelContract',
            }),
            publicClient.readContract({
                address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
                abi: TRAVEL_ABI,
                functionName: 'travelManager',
            }),
        ]);

        console.log(`NFT owner: ${nftOwner as string}`);
        console.log(`NFT travelContract: ${nftTravelContract as string}`);
        console.log(`NFT omniTravelContract: ${nftOmniTravelContract as string}`);
        console.log(`Travel manager: ${travelManager as string}`);
        console.log(`Relayer manages travel? ${(travelManager as string).toLowerCase() === account.address.toLowerCase()}`);

        try {
            const owner = await publicClient.readContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'ownerOf',
                args: [1n],
            });
            console.log(`Frog #1 owner: ${owner}`);

            const frog = await publicClient.readContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'getFrog',
                args: [1n],
            });
            console.log(`Frog #1 status: ${(frog as readonly unknown[])[3]}`);

            const activeTravel = await publicClient.readContract({
                address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
                abi: TRAVEL_ABI,
                functionName: 'getActiveTravel',
                args: [1n],
            });
            console.log(`Frog #1 active travel: ${JSON.stringify(activeTravel, (_, value) => typeof value === 'bigint' ? value.toString() : value)}`);
        } catch (error: any) {
            console.log(`Failed to check frog #1: ${error.message}`);
        }
    } catch (error) {
        console.error('Error checking contract:', error);
    }
}

checkContract();
