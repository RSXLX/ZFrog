/**
 * Decode error selector 0x18076cfe
 */

const hre = require("hardhat");

async function main() {
    console.log("\n🔍 Decoding error selector 0x18076cfe\n");

    // Common error selectors
    const errors = {
        "0x08c379a0": "Error(string) - standard revert",
        "0x4e487b71": "Panic(uint256) - assertion failure",
        "0x18076cfe": "Unknown - need to check contract errors"
    };

    const selector = "0x18076cfe";
    console.log(`Selector: ${selector}`);
    console.log(`Known: ${errors[selector] || "Not a standard error"}`);

    // Try to compute selectors for common custom errors
    const customErrors = [
        "Unauthorized()",
        "InsufficientBalance()",
        "InvalidInput()",
        "NotOwner()",
        "AlreadyExists()",
        "NotFound()",
        "Paused()",
        "ZeroAddress()",
        "EnforcedPause()",  // OpenZeppelin Pausable
        "ExpectedPause()",
        "OwnableUnauthorizedAccount(address)",
        "OwnableInvalidOwner(address)",
    ];

    console.log("\nChecking custom error selectors:");
    for (const err of customErrors) {
        const sig = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(err)).slice(0, 10);
        if (sig === selector) {
            console.log(`  ✅ MATCH: ${err} = ${sig}`);
        } else {
            console.log(`  ${err} = ${sig}`);
        }
    }

    // Check if it could be a function selector that was accidentally returned
    console.log("\n--- Checking OmniTravel function selectors ---");
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const funcs = OmniTravel.interface.fragments.filter(f => f.type === 'function');
    for (const func of funcs) {
        const sel = OmniTravel.interface.getFunction(func.name).selector;
        if (sel === selector) {
            console.log(`  ✅ MATCH: ${func.name} = ${sel}`);
        }
    }

    // Check ZetaFrogNFT errors
    console.log("\n--- Checking ZetaFrogNFT error selectors ---");
    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const nftErrors = ZetaFrogNFT.interface.fragments.filter(f => f.type === 'error');
    for (const err of nftErrors) {
        const sel = "0x" + hre.ethers.keccak256(hre.ethers.toUtf8Bytes(err.format("sighash"))).slice(2, 10);
        console.log(`  ${err.format("sighash")} = ${sel}`);
        if (sel === selector) {
            console.log(`  ✅ MATCH!`);
        }
    }

    // Compute ReentrancyGuard error
    const reentrancyError = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ReentrancyGuardReentrantCall()")).slice(0, 10);
    console.log(`\nReentrancyGuardReentrantCall() = ${reentrancyError}`);
    if (reentrancyError === selector) {
        console.log("  ✅ MATCH! This is a reentrancy guard error!");
    }
}

main().catch(console.error);
