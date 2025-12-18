
import { aiService } from '../src/services/ai.service';
import { config } from '../src/config';

console.log('Testing AI Service...');
console.log('API Key present:', !!config.QWEN_API_KEY);
console.log('Base URL:', config.QWEN_BASE_URL);

async function test() {
    try {
        const result = await aiService.generateJournal(
            'TestFrog', 
            {
                walletAddress: '0x1234567890123456789012345678901234567890',
                chainId: 1,
                transactions: [],
                totalTxCount: 5,
                totalValueWei: 1000000n,
                notableEvents: [{ type: 'large_transfer', description: 'Received 1 ETH', txHash: '0x', timestamp: Date.now() }],
                observedFrom: new Date(),
                observedTo: new Date()
            }, 
            1
        );
        console.log('AI Generation Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('AI Test Failed:', error);
    }
}

test();
