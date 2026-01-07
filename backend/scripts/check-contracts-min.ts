
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

const zetachainAthens = defineChain({
    id: 7001,
    name: 'ZetaChain Athens',
    nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 },
    rpcUrls: { default: { http: ['https://zetachain-athens.g.allthatnode.com/archive/evm'] } },
});

const candidates = {
    'Frog-8460': '0x8460344d5435D08CaBAE2f1157D355209cb9E7cF',
    'Frog-A51c': '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
    'Souvenir-78E7': '0x78E7E59Cab2a14ce9aA82A29953359A2f5a93662',
    'Souvenir-9A67': '0x9A676e781A523b5d0C0e43731313A708CB607508',
    'Travel-0DCd': '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82'
};

async function main() {
    const client = createPublicClient({ chain: zetachainAthens, transport: http() });
    const results: Record<string, string> = {};
    for (const [k, v] of Object.entries(candidates)) {
        try {
            const c = await client.getBytecode({ address: v as `0x${string}` });
            results[k] = (c && c.length > 2) ? 'YES' : 'NO';
        } catch (e) { results[k] = 'ERR'; }
    }
    console.log(JSON.stringify(results, null, 2));
}
main();
