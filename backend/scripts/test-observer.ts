
import { observerService } from '../src/services/observer.service';
import { logger } from '../src/utils/logger';

async function test() {
    console.log('Testing Observer Service...');
    
    // Polygon active wallet (Binance Hot Wallet)
    const targetWallet = '0x2969eac0ea4007f3521a00a16b9b3df716499806'; 
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    
    console.log(`Observing ${targetWallet} from ${oneHourAgo.toISOString()} to ${now.toISOString()}`);
    
    try {
        const result = await observerService.observeWallet(
            targetWallet,
            oneHourAgo,
            now,
            137 // Polygon
        );
        
        console.log('Observation Result:');
        console.log(`- Tx Count: ${result.totalTxCount}`);
        console.log(`- Total Value: ${result.totalValueWei}`);
        console.log(`- Notable Events: ${result.notableEvents.length}`);
        
        if (result.totalTxCount === 0) {
            console.warn('Warning: 0 transactions found. Might be RPC issue or inactive wallet.');
        } else {
            console.log('Success: Found transactions.');
        }
        
    } catch (error) {
        console.error('Observer Test Failed:', error);
    }
}

test();
