
import { config } from '../config';

console.log('=== Backend Config Debug ===');
console.log('OMNI_TRAVEL_ADDRESS:', config.OMNI_TRAVEL_ADDRESS);
console.log('Expected: 0x743476f8201885B396329c8AC03b560e1D240666');
console.log('Match:', config.OMNI_TRAVEL_ADDRESS === '0x743476f8201885B396329c8AC03b560e1D240666');
