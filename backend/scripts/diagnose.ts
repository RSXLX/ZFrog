
import { createPublicClient, http, parseAbiItem, defineChain } from 'viem';
import { config } from '../src/config';

// 定义 ZetaChain
const zetachainAthens = defineChain({
  id: 7001,
  name: 'ZetaChain Athens Testnet',
  nativeCurrency: { decimals: 18, name: 'ZETA', symbol: 'ZETA' },
  rpcUrls: {
    default: { http: [config.ZETACHAIN_RPC_URL] },
  },
});

async function main() {
  console.log('Starting diagnosis...');
  console.log('RPC URL:', config.ZETACHAIN_RPC_URL);
  console.log('Contract Address:', config.ZETAFROG_NFT_ADDRESS);

  try {
    const client = createPublicClient({
      chain: zetachainAthens,
      transport: http(config.ZETACHAIN_RPC_URL),
    });

    const blockNumber = await client.getBlockNumber();
    console.log('Current Block Number:', blockNumber.toString());

    // 尝试获取最近 2000 个区块的 FrogMinted 事件
    const fromBlock = blockNumber - BigInt(2000);
    console.log(`Scanning for FrogMinted events from block ${fromBlock} to ${blockNumber}...`);

    const logs = await client.getLogs({
      address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
      event: parseAbiItem('event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)'),
      fromBlock,
      toBlock: blockNumber,
    });

    console.log(`Found ${logs.length} FrogMinted events.`);
    
    logs.forEach(log => {
      const { tokenId, name, owner } = log.args;
      console.log(`- TokenId: ${tokenId}, Name: ${name}, Owner: ${owner}`);
    });

  } catch (error) {
    console.error('Diagnosis failed:', error);
  }
}

main();
