/**
 * Check if the on-chain ZetaFrogNFT accepts calls from OmniTravel
 * by checking the actual bytecode
 */

const hre = require("hardhat");

const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";
const OMNI_TRAVEL = "0x4366FDd3a1BFe4aa7AC8042a6760cB6fEf0d0837";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Checking on-chain ZetaFrogNFT\n`);

    // Get bytecode
    const code = await signer.provider.getCode(ZETA_FROG_NFT);
    console.log(`Contract bytecode length: ${code.length / 2} bytes`);

    // Check for "omniTravelContract" in storage slot
    // travelContract should be at slot 8 or similar (after ERC721 storage)
    console.log("\nChecking storage slots...");
    
    // Read storage at various positions
    for (let i = 0; i < 15; i++) {
        const slot = await signer.provider.getStorage(ZETA_FROG_NFT, i);
        if (slot !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
            console.log(`  Slot ${i}: ${slot}`);
        }
    }

    // The travelContract is probably at a specific slot
    // Let's try to find it by checking if any slot contains our OmniTravel address
    console.log("\nLooking for OmniTravel address in storage...");
    const omniLower = OMNI_TRAVEL.toLowerCase().slice(2);
    
    for (let i = 0; i < 20; i++) {
        const slot = await signer.provider.getStorage(ZETA_FROG_NFT, i);
        if (slot.toLowerCase().includes(omniLower)) {
            console.log(`  Found at slot ${i}!`);
        }
    }

    // Try to manually calculate storage slots
    // For a simple contract layout:
    // - ERC721 uses slots 0-6 approximately
    // - travelContract might be slot 8 or so
    
    console.log("\n--- Checking specific address slots ---");
    
    // Call travelContract() to verify
    const abiCoder = new hre.ethers.AbiCoder();
    
    // travelContract() selector
    const travelContractSelector = "0x" + hre.ethers.keccak256(hre.ethers.toUtf8Bytes("travelContract()")).slice(2, 10);
    console.log(`travelContract() selector: ${travelContractSelector}`);
    
    const result = await signer.call({
        to: ZETA_FROG_NFT,
        data: travelContractSelector
    });
    console.log(`travelContract() result: ${result}`);
    
    // Decode as address
    if (result && result.length >= 66) {
        const addr = "0x" + result.slice(26);
        console.log(`Decoded address: ${addr}`);
        console.log(`Matches OmniTravel: ${addr.toLowerCase() === OMNI_TRAVEL.toLowerCase() ? "✅" : "❌"}`);
    }

    // Also check getFrogStatus
    console.log("\n--- Checking getFrogStatus(3) ---");
    const getFrogStatusSelector = "0x" + hre.ethers.keccak256(hre.ethers.toUtf8Bytes("getFrogStatus(uint256)")).slice(2, 10);
    const calldata = getFrogStatusSelector + abiCoder.encode(["uint256"], [3]).slice(2);
    
    const statusResult = await signer.call({
        to: ZETA_FROG_NFT,
        data: calldata
    });
    console.log(`getFrogStatus(3) result: ${statusResult}`);
}

main().catch(console.error);
