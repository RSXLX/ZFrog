
import { ipfsService } from '../src/services/ipfs.service';
import { config } from '../src/config';

console.log('Testing IPFS Service...');
console.log('Pinata Key present:', !!config.PINATA_API_KEY);

async function test() {
    try {
        const hash = await ipfsService.uploadJournal(
            'TestFrog',
            123,
            {
                title: 'Test Journal',
                content: 'Hello IPFS',
                mood: 'happy',
                highlights: ['Tested IPFS']
            },
            1
        );
        console.log('IPFS Upload Result:', hash);
        if (hash.startsWith('ipfs://Qm') && !hash.includes('mock')) {
             console.log('Success: Real IPFS hash generated');
        } else {
             console.log('Warning: Mock hash or failure detected');
        }
    } catch (error) {
        console.error('IPFS Test Failed:', error);
    }
}

test();
