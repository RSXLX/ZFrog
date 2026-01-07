const addresses = require('@zetachain/protocol-contracts/dist/data/addresses.testnet.json');
const router = addresses.find(a => a.chain_name === 'zeta_testnet' && a.type === 'uniswapV2Router02');
if (router) {
    console.log("ROUTER_ADDRESS:" + router.address);
} else {
    // Print potential candidates
    const zetaAddrs = addresses.filter(a => a.chain_name === 'zeta_testnet');
    console.log("Router not found. Available types:");
    console.log(zetaAddrs.map(a => `${a.type}: ${a.address}`).join('\n'));
}
