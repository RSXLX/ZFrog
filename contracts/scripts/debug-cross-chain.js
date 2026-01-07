/**
 * 🕵️ Debug Cross-Chain Travel
 * 
 * Checks all pre-conditions for startCrossChainTravel:
 * 1. Eligibility
 * 2. Ownership
 * 3. Contract Approval
 * 4. Chain Support (is target chain supported?)
 * 5. Connector Config (is connector set?)
 * 6. Fee Calculation
 * 
 * Usage: npx hardhat run scripts/debug-cross-chain.js --network zetaAthens
 */

const { ethers } = require("hardhat");

const CONTRACTS = {
    ZetaFrogNFT: "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f",
    OmniTravel: "0xE36713321E988d237D940A25BAb7Ad509f4f1387",
};

const TOKEN_ID = 0;
const TARGET_CHAIN_ID = 97; // BSC Testnet
// const TARGET_CHAIN_ID = 31337; // Localhost (might not have connector)

async function main() {
    console.log("\n🕵️ Debug Cross-Chain Travel Pre-flight Check\n");
    console.log("=".repeat(60));

    const [signer] = await ethers.getSigners();
    console.log(`📍 Signer: ${signer.address}`);

    const frogNFT = await ethers.getContractAt("ZetaFrogNFT", CONTRACTS.ZetaFrogNFT);
    const omniTravel = await ethers.getContractAt("OmniTravel", CONTRACTS.OmniTravel);

    // 1. Check Owner
    const owner = await frogNFT.ownerOf(TOKEN_ID);
    console.log(`\n1. Ownership Check:`);
    console.log(`   Frog Owner: ${owner}`);
    console.log(`   Signer:     ${signer.address}`);
    console.log(`   Match:      ${owner.toLowerCase() === signer.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);

    // 2. Check Approval
    const isApproved = await frogNFT.isApprovedForAll(owner, CONTRACTS.OmniTravel);
    console.log(`\n2. Approval Check:`);
    console.log(`   Is OmniTravel approved? ${isApproved ? '✅ YES' : '❌ NO'}`);

    // 3. Check Status
    const status = await frogNFT.getFrogStatus(TOKEN_ID);
    console.log(`\n3. Frog Status Check:`);
    console.log(`   Status: ${status} (0=Idle, 1=Traveling, 2=Locked)`);
    console.log(`   Eligible: ${status == 0n ? '✅ YES' : '❌ NO'}`);

    // 4. Check Supported Chain
    const isSupported = await omniTravel.supportedChains(TARGET_CHAIN_ID);
    console.log(`\n4. Supported Chain Check (Chain ID ${TARGET_CHAIN_ID}):`);
    console.log(`   Supported: ${isSupported ? '✅ YES' : '❌ NO'}`);

    // 5. Check Connector (Use storage slot or getter if available)
    // chainConnectors is mapping(uint256 => bytes), usually public getter chainConnectors(tokenId)
    console.log(`\n5. Chain Connector Check:`);
    try {
        const connector = await omniTravel.chainConnectors(TARGET_CHAIN_ID);
        console.log(`   Connector: ${connector}`);
        console.log(`   Valid:     ${connector && connector !== '0x' ? '✅ YES' : '❌ NO'}`);
    } catch (e) {
        console.log(`   ❌ Failed to read connector: ${e.message}`);
    }
    
    // 6. Check ZRC20 (for gas)
    console.log(`\n6. ZRC20 Gas Token Check:`);
    try {
        const zrc20 = await omniTravel.chainZRC20(TARGET_CHAIN_ID);
        console.log(`   ZRC20: ${zrc20}`);
        console.log(`   Valid: ${zrc20 && zrc20 !== ethers.ZeroAddress ? '✅ YES' : '❌ NO'}`);
    } catch (e) {
        console.log(`   ❌ Failed to read ZRC20: ${e.message}`);
    }

    // 7. Check Test Mode
    const testMode = await omniTravel.testMode();
    console.log(`\n7. Test Mode Check:`);
    console.log(`   Test Mode: ${testMode ? '🟢 ON' : '⚫ OFF'}`);

    // 8. Try Simulation (callStatic)
    console.log(`\n8. Simulating Transaction...`);
    const provisions = ethers.parseEther("0.01");
    
    if (owner.toLowerCase() === signer.address.toLowerCase() && isApproved && status == 0n && isSupported) {
        try {
            await omniTravel.startCrossChainTravel.staticCall(
                TOKEN_ID,
                TARGET_CHAIN_ID,
                60, // 1 min duration
                { value: provisions }
            );
            console.log("   ✅ Simulation Successful! Transaction should work.");
        } catch (error) {
            console.log(`   ❌ Simulation Failed: ${error.reason || error.message}`);
            // Decode error if possible
            if (error.data) console.log(`   Error Data: ${error.data}`);
        }
    } else {
        console.log("   ⚠️ Skipping simulation due to pre-check failures.");
    }

    console.log("\n" + "=".repeat(60));
    console.log("🕵️ Diagnosis Completed!\n");
}

main().catch(console.error);
