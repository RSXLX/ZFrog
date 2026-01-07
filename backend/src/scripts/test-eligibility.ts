
import { omniTravelService } from '../services/omni-travel.service';

async function main() {
    console.log('=== Testing canStartCrossChainTravel for Frog #3 ===\n');
    
    try {
        const result = await omniTravelService.canStartCrossChainTravel(3, 97);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
