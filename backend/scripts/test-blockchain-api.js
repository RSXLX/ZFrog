const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Test addresses with known activity
const TEST_ADDRESSES = {
    11155111: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Ethereum Sepolia - Vitalik
    97: '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3', // BSC Testnet - Binance Hot Wallet
    7001: '0x0000000000000000000000000000000000000000', // ZetaChain - We'll test if API works
};

function getExplorerApiUrl(chainId) {
    const urls = {
        1: 'https://api.etherscan.io',
        5: 'https://api-goerli.etherscan.io',
        11155111: 'https://api-sepolia.etherscan.io',
        137: 'https://api.polygonscan.com',
        56: 'https://api.bscscan.com',
        97: 'https://api-testnet.bscscan.com',
        7001: 'https://zetachain-athens.blockscout.com'
    };
    return urls[chainId] || urls[1];
}

async function testChainAPI(chainId, address) {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    const baseUrl = getExplorerApiUrl(chainId);
    
    console.log(`\n--- Testing Chain ${chainId} ---`);
    console.log(`API URL: ${baseUrl}`);
    console.log(`Test Address: ${address}`);
    console.log(`API Key Present: ${!!apiKey}`);
    
    try {
        const response = await axios.get(`${baseUrl}/api`, {
            params: {
                module: 'account',
                action: 'txlist',
                address: address,
                startblock: 0,
                endblock: 99999999,
                sort: 'desc',
                apikey: apiKey
            },
            timeout: 15000
        });
        
        console.log(`✅ API Response Status: ${response.data.status}`);
        console.log(`   Message: ${response.data.message}`);
        
        if (response.data.result && Array.isArray(response.data.result)) {
            console.log(`   Transactions Found: ${response.data.result.length}`);
            if (response.data.result.length > 0) {
                const firstTx = response.data.result[0];
                console.log(`   Sample TX Hash: ${firstTx.hash}`);
                console.log(`   Sample TX Value: ${firstTx.value} wei`);
            }
        } else {
            console.log(`   Result: ${JSON.stringify(response.data.result).substring(0, 100)}`);
        }
        
        return true;
    } catch (error) {
        console.error(`❌ API Call Failed:`);
        console.error(`   Error: ${error.message}`);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
        return false;
    }
}

async function runTests() {
    console.log('=== Blockchain Explorer API Connectivity Test ===\n');
    
    for (const [chainId, address] of Object.entries(TEST_ADDRESSES)) {
        await testChainAPI(parseInt(chainId), address);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
    
    console.log('\n=== Test Complete ===');
}

runTests().catch(console.error);
