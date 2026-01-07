/**
 * Comprehensive Diagnostic Script for Cross-Chain Travel
 * Checks all components that could cause interaction failure
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const ADDRESSES_FILE = path.join(__dirname, "../deployed-addresses.json");
const ZETA_FROG_NFT = "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Running Diagnostics with account: ${signer.address}\n`);
    console.log("=".repeat(60));

    // Load addresses
    let addresses = {};
    try {
        addresses = JSON.parse(fs.readFileSync(ADDRESSES_FILE, "utf8"));
        console.log("📋 Deployed Addresses:", JSON.stringify(addresses, null, 2));
    } catch (e) {
        console.error("❌ Failed to load addresses file");
        return;
    }

    const omniTravelAddress = addresses.zetaAthens?.omniTravel;
    if (!omniTravelAddress) {
        console.error("❌ OmniTravel address not found!");
        return;
    }

    console.log("\n" + "=".repeat(60));
    console.log("1️⃣ CHECKING ZETAFROG NFT CONTRACT");
    console.log("=".repeat(60));

    const ZetaFrogNFT = await hre.ethers.getContractFactory("ZetaFrogNFT");
    const zetaFrog = ZetaFrogNFT.attach(ZETA_FROG_NFT);

    try {
        const owner = await zetaFrog.owner();
        console.log(`   Owner: ${owner}`);
        
        const travelContract = await zetaFrog.travelContract();
        console.log(`   travelContract: ${travelContract}`);
        console.log(`   Expected (OmniTravel): ${omniTravelAddress}`);
        
        if (travelContract.toLowerCase() === omniTravelAddress.toLowerCase()) {
            console.log("   ✅ Permission OK: OmniTravel is authorized");
        } else {
            console.log("   ❌ Permission MISMATCH!");
        }

        // Check frog #3 status (user's frog)
        const tokenId = 3;
        const frogOwner = await zetaFrog.ownerOf(tokenId);
        console.log(`\n   Frog #${tokenId} Owner: ${frogOwner}`);
        
        const frogData = await zetaFrog.frogs(tokenId);
        console.log(`   Frog #${tokenId} Data:`, {
            name: frogData.name || frogData[0],
            status: Number(frogData.status || frogData[3]),
            // 0=Idle, 1=Traveling, 2=CrossChainLocked
        });
        
        const statusNum = Number(frogData.status || frogData[3]);
        if (statusNum === 0) {
            console.log("   ✅ Frog Status: Idle (can travel)");
        } else if (statusNum === 1) {
            console.log("   ⚠️ Frog Status: Traveling (cannot start new travel)");
        } else if (statusNum === 2) {
            console.log("   ⚠️ Frog Status: CrossChainLocked (already locked)");
        }
        
    } catch (e) {
        console.error("   ❌ Error reading ZetaFrogNFT:", e.message);
    }

    console.log("\n" + "=".repeat(60));
    console.log("2️⃣ CHECKING OMNITRAVEL CONTRACT");
    console.log("=".repeat(60));

    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(omniTravelAddress);

    try {
        const testMode = await omniTravel.testMode();
        console.log(`   Test Mode: ${testMode ? "ENABLED ✅" : "DISABLED ❌"}`);

        // Check chain 97 (BSC Testnet)
        const chain97Supported = await omniTravel.supportedChains(97);
        console.log(`   Chain 97 (BSC) Supported: ${chain97Supported}`);

        const chain97Connector = await omniTravel.chainConnectors(97);
        console.log(`   Chain 97 Connector: ${chain97Connector}`);
        if (chain97Connector && chain97Connector !== "0x" && chain97Connector.length > 2) {
            console.log("   ✅ BSC Connector configured");
        } else {
            console.log("   ❌ BSC Connector NOT configured!");
        }

        // Check frog #3 travel status
        const tokenId = 3;
        const travelInfo = await omniTravel.crossChainTravels(tokenId);
        console.log(`\n   Frog #${tokenId} CrossChain Status:`, {
            status: Number(travelInfo.status),
            // 0=None, 1=Locked, 2=Traveling, 3=OnTarget, 4=Returning, 5=Completed, 6=Failed
            targetChainId: Number(travelInfo.targetChainId),
        });

        const statusNum = Number(travelInfo.status);
        const statusNames = ["None", "Locked", "Traveling", "OnTarget", "Returning", "Completed", "Failed", "Timeout"];
        console.log(`   Status Name: ${statusNames[statusNum] || "Unknown"}`);

        if (statusNum === 0 || statusNum === 5) {
            console.log("   ✅ Can start new cross-chain travel");
        } else {
            console.log("   ❌ Cannot start - already in progress or failed");
        }

        // Try canStartCrossChainTravel
        const canStart = await omniTravel.canStartCrossChainTravel(tokenId);
        console.log(`\n   canStartCrossChainTravel(${tokenId}): ${canStart}`);

        // Check provisions requirement
        const requiredProvisions = await omniTravel.calculateProvisions(1); // 1 hour
        console.log(`   Required Provisions (1 hour): ${hre.ethers.formatEther(requiredProvisions)} ZETA`);

        // Check ZetaFrogNFT reference
        const nftRef = await omniTravel.zetaFrogNFT();
        console.log(`\n   zetaFrogNFT reference: ${nftRef}`);
        if (nftRef.toLowerCase() === ZETA_FROG_NFT.toLowerCase()) {
            console.log("   ✅ NFT reference correct");
        } else {
            console.log("   ❌ NFT reference MISMATCH!");
        }

    } catch (e) {
        console.error("   ❌ Error reading OmniTravel:", e.message);
    }

    console.log("\n" + "=".repeat(60));
    console.log("3️⃣ SIMULATING TRANSACTION");
    console.log("=".repeat(60));

    try {
        const tokenId = 3;
        const targetChainId = 97;
        const duration = 60; // 1 minute test
        const provisions = hre.ethers.parseEther("0.002");

        console.log(`   Simulating startCrossChainTravel(${tokenId}, ${targetChainId}, ${duration})`);
        console.log(`   With value: ${hre.ethers.formatEther(provisions)} ZETA`);

        // Try to estimate gas (this will reveal the revert reason)
        const gasEstimate = await omniTravel.startCrossChainTravel.estimateGas(
            tokenId,
            targetChainId,
            duration,
            { value: provisions }
        );
        console.log(`   ✅ Gas estimate: ${gasEstimate.toString()}`);
        console.log("   ✅ Transaction SHOULD succeed!");

    } catch (e) {
        console.error(`   ❌ Simulation FAILED!`);
        console.error(`   Error: ${e.message}`);
        
        // Try to extract revert reason
        if (e.reason) {
            console.error(`   Revert Reason: ${e.reason}`);
        }
        if (e.data) {
            console.error(`   Error Data: ${e.data}`);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("DIAGNOSTICS COMPLETE");
    console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
