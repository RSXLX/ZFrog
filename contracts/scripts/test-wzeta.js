/**
 * Test WZETA deposit functionality
 */

const hre = require("hardhat");

const WZETA_ADDRESS = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log(`Testing WZETA with account: ${signer.address}\n`);

    // Check native balance
    const nativeBalance = await signer.provider.getBalance(signer.address);
    console.log(`Native ZETA Balance: ${hre.ethers.formatEther(nativeBalance)}`);

    // Try to call deposit on WZETA
    const wzetaAbi = [
        "function deposit() external payable",
        "function balanceOf(address) view returns (uint256)",
        "function withdraw(uint256) external"
    ];

    const wzeta = new hre.ethers.Contract(WZETA_ADDRESS, wzetaAbi, signer);

    // Check contract code
    const code = await signer.provider.getCode(WZETA_ADDRESS);
    console.log(`\nWZETA contract has code: ${code.length > 2 ? "YES" : "NO"}`);
    console.log(`Code length: ${code.length} bytes`);

    // Try to check balance
    try {
        const balance = await wzeta.balanceOf(signer.address);
        console.log(`\nWZETA Balance: ${hre.ethers.formatEther(balance)}`);
    } catch (e) {
        console.log(`Failed to check WZETA balance: ${e.message}`);
    }

    // Try to call deposit
    console.log("\n--- Testing deposit() ---");
    try {
        const depositAmount = hre.ethers.parseEther("0.001");
        
        // First estimate gas
        const gasEstimate = await wzeta.deposit.estimateGas({ value: depositAmount });
        console.log(`Deposit gas estimate: ${gasEstimate.toString()}`);
        
        // Actually deposit
        console.log(`Depositing ${hre.ethers.formatEther(depositAmount)} ZETA to WZETA...`);
        const tx = await wzeta.deposit({ value: depositAmount });
        console.log(`TX Hash: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Deposit successful!");
        
        // Check new balance
        const newBalance = await wzeta.balanceOf(signer.address);
        console.log(`New WZETA Balance: ${hre.ethers.formatEther(newBalance)}`);
        
    } catch (e) {
        console.log(`❌ Deposit failed: ${e.message}`);
        
        // Try alternative - maybe it's just receive() or fallback()
        console.log("\n--- Trying direct transfer (fallback) ---");
        try {
            const tx = await signer.sendTransaction({
                to: WZETA_ADDRESS,
                value: hre.ethers.parseEther("0.001")
            });
            await tx.wait();
            console.log("✅ Direct transfer worked!");
        } catch (e2) {
            console.log(`❌ Direct transfer also failed: ${e2.message}`);
        }
    }
}

main().catch(console.error);
