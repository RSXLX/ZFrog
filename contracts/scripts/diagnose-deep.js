/**
 * Deep Diagnostic - Check ZetaConnector requirements
 */

const hre = require("hardhat");

const OMNI_TRAVEL = "0xFdd234bd79004bd46964103201081CB652B02488";
const ZETA_CONNECTOR = "0x239e96c8f17C85c30100AC26F635Ea15f23E9c67";
const ZETA_TOKEN = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`\n🔍 Deep Diagnostic with account: ${signer.address}\n`);

    // Check ZETA token balance
    const zetaToken = await hre.ethers.getContractAt("IERC20", ZETA_TOKEN);
    
    try {
        const balance = await zetaToken.balanceOf(signer.address);
        console.log(`ZETA Token Balance: ${hre.ethers.formatEther(balance)} ZETA`);
        
        const omniTravelBalance = await zetaToken.balanceOf(OMNI_TRAVEL);
        console.log(`OmniTravel ZETA Balance: ${hre.ethers.formatEther(omniTravelBalance)} ZETA`);
    } catch (e) {
        console.log("Could not check ZETA token balance:", e.message);
    }

    // Check native ZETA balance
    const nativeBalance = await signer.provider.getBalance(signer.address);
    console.log(`Native ZETA Balance: ${hre.ethers.formatEther(nativeBalance)} ZETA`);

    const omniNativeBalance = await signer.provider.getBalance(OMNI_TRAVEL);
    console.log(`OmniTravel Native Balance: ${hre.ethers.formatEther(omniNativeBalance)} ZETA`);

    // Try to call the connector directly to see what happens
    console.log("\n--- Checking ZetaConnector ---");
    
    // Get connector bytecode to verify it exists
    const connectorCode = await signer.provider.getCode(ZETA_CONNECTOR);
    console.log(`Connector has code: ${connectorCode.length > 2 ? "YES" : "NO"}`);

    // Check if OmniTravel has the right connector reference
    const OmniTravel = await hre.ethers.getContractFactory("OmniTravel");
    const omniTravel = OmniTravel.attach(OMNI_TRAVEL);
    
    const connectorRef = await omniTravel.zetaConnector();
    console.log(`OmniTravel.zetaConnector: ${connectorRef}`);
    console.log(`Expected: ${ZETA_CONNECTOR}`);
    
    if (connectorRef.toLowerCase() !== ZETA_CONNECTOR.toLowerCase()) {
        console.log("❌ CONNECTOR MISMATCH!");
    } else {
        console.log("✅ Connector reference correct");
    }

    // Try static call to simulate without state change
    console.log("\n--- Simulating with staticCall ---");
    try {
        // This will fail because startCrossChainTravel modifies state, but error might be revealing
        await omniTravel.startCrossChainTravel.staticCall(
            3,  // tokenId
            97, // BSC
            60, // 1 minute
            { value: hre.ethers.parseEther("0.002") }
        );
    } catch (e) {
        console.log("Static call error:", e.message);
        if (e.data) {
            console.log("Error data:", e.data);
        }
        // Try to decode error
        if (e.reason) {
            console.log("Reason:", e.reason);
        }
    }

    // Check if the issue is with ZetaConnector.send
    console.log("\n--- Checking ZetaConnector.send interface ---");
    
    // Try to get the selector
    const connectorAbi = [
        "function send((uint256 destinationChainId, bytes destinationAddress, uint256 destinationGasLimit, bytes message, uint256 zetaValueAndGas, bytes zetaParams) input) external"
    ];
    const connector = new hre.ethers.Contract(ZETA_CONNECTOR, connectorAbi, signer);
    
    try {
        // Create a test input
        const testInput = {
            destinationChainId: 97,
            destinationAddress: "0x000000000000000000000000928f10ac4bfce16306ff5606a4c53eda8f6db710",
            destinationGasLimit: 500000,
            message: "0x",
            zetaValueAndGas: hre.ethers.parseEther("0.001"),
            zetaParams: "0x"
        };
        
        // Estimate gas for connector.send
        const gasEst = await connector.send.estimateGas(testInput, { value: hre.ethers.parseEther("0.001") });
        console.log("Connector.send gas estimate:", gasEst.toString());
    } catch (e) {
        console.log("Connector.send estimation failed:", e.message);
        
        // The ZetaChain connector might require ZETA token approval, not native ZETA
        console.log("\n⚠️ ZetaChain Athens testnet connector may require ZETA TOKEN (ERC20), not native value!");
        console.log("The OmniTravel contract sends msg.value but connector may expect token transfer.");
    }

    console.log("\n--- DIAGNOSIS COMPLETE ---");
}

main().catch(console.error);
