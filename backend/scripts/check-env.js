const dotenv = require('dotenv');
const path = require('path');
const { ethers } = require('ethers');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('=== Environment Configuration Check ===\n');

const checks = {
    'ZETAFROG_NFT_ADDRESS': process.env.ZETAFROG_NFT_ADDRESS,
    'ZETACHAIN_RPC_URL': process.env.ZETACHAIN_RPC_URL,
    'DEPLOYER_KEY or PRIVATE_KEY': process.env.DEPLOYER_KEY || process.env.PRIVATE_KEY,
    'RELAYER_PRIVATE_KEY': process.env.RELAYER_PRIVATE_KEY,
};

let allGood = true;

for (const [key, value] of Object.entries(checks)) {
    if (value) {
        console.log(`✅ ${key}: ${key.includes('KEY') ? '[PRESENT]' : value}`);
        
        // Show addresses for private keys
        if (key.includes('KEY') && value) {
            try {
                const wallet = new ethers.Wallet(value);
                console.log(`   → Address: ${wallet.address}`);
            } catch (e) {
                console.log(`   ⚠️  Warning: Invalid private key format`);
            }
        }
    } else {
        console.log(`❌ ${key}: MISSING`);
        allGood = false;
    }
}

console.log('\n' + '='.repeat(50));

if (allGood) {
    console.log('✅ All required environment variables are set!');
    console.log('\nYou can now run:');
    console.log('  node scripts/grant-permissions.js');
} else {
    console.log('❌ Some required environment variables are missing.');
    console.log('\nPlease update your .env file before proceeding.');
}
