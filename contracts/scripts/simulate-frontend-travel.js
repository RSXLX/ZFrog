const hre = require("hardhat");

async function main() {
  const OMNI_TRAVEL_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_OMNI_TRAVEL || process.env.OMNI_TRAVEL_ADDRESS || "0xE36713321E988d237D940A25BAb7Ad509f4f1387";
  const ZETA_FROG_NFT_ADDRESS = process.env.VITE_CONTRACT_ADDRESS_ZETAFROG || process.env.ZETAFROG_NFT_ADDRESS || "0x21C6C9C82C7B2317E2fa25E2cdAa29E45C84fA1f";
  
  const API_BASE_URL = "http://localhost:3001/api";
  
  const tokenId = 18;
  const frogId = 18; // Assuming DB ID matches Token ID for simplicity or this specific case
  const targetChainId = 97;
  const duration = 60;
  
  console.log(`\n🚀 Simulating Request for Frog #${tokenId} (DB ID: ${frogId})...\n`);

  console.log("Environment ZETAFROG_NFT_ADDRESS:", process.env.ZETAFROG_NFT_ADDRESS);
  console.log("Environment OMNI_TRAVEL_ADDRESS:", process.env.OMNI_TRAVEL_ADDRESS);
  console.log("Using ZETAFROG_ADDRESS:", ZETA_FROG_NFT_ADDRESS);
  console.log("Using OMNI_TRAVEL_ADDRESS:", OMNI_TRAVEL_ADDRESS);

  // 1. Setup Contracts
  const [signer] = await hre.ethers.getSigners();
  const OmniTravel = await hre.ethers.getContractAt("OmniTravel", OMNI_TRAVEL_ADDRESS);
  const ZetaFrogNFT = await hre.ethers.getContractAt("ZetaFrogNFT", ZETA_FROG_NFT_ADDRESS);
  
  // Debug: Check contract existence and frog
  try {
      const name = await ZetaFrogNFT.name();
      console.log(`Contract Name: ${name}`);
      const supply = await ZetaFrogNFT.totalSupply(); 
      console.log(`Total Supply: ${supply}`);
      
      // Check what OmniTravel thinks the token contract is
      try {
          const linkedToken = await OmniTravel.zetaFrogNFT();
          console.log(`OmniTravel linked Token Address: ${linkedToken}`);
          if (linkedToken.toLowerCase() !== ZETA_FROG_NFT_ADDRESS.toLowerCase()) {
              console.error("❌ MISMATCH! OmniTravel is using a different NFT contract!");
          } else {
              console.log("✅ OmniTravel is using the correct NFT contract.");
          }
      } catch (e) {
          console.log("Could not read zetaFrogNFT from OmniTravel:", e.message);
      }
      
      // Check if ZetaFrogNFT recognizes OmniTravel as the travel contract
      try {
          const currentTravel = await ZetaFrogNFT.travelContract();
          console.log(`ZetaFrogNFT authorized Travel Contract: ${currentTravel}`);
          if (currentTravel.toLowerCase() !== OMNI_TRAVEL_ADDRESS.toLowerCase()) {
              console.log("⚠️ Mismatch! Updating ZetaFrogNFT to authorize OmniTravel...");
              // We need to be owner of ZetaFrogNFT to do this
              const txAuth = await ZetaFrogNFT.setTravelContract(OMNI_TRAVEL_ADDRESS);
              await txAuth.wait();
              console.log("✅ ZetaFrogNFT updated successfully.");
          } else {
              console.log("✅ ZetaFrogNFT is already authorized.");
          }
      } catch(e) {
           console.log("Could not check/set travelContract:", e.message);
      }

  } catch (e) {
      console.log("Could not get name/supply:", e.message);
  }

  // 2. Check Authorization
  console.log("Checking authorization...");
  try {
     const owner = await ZetaFrogNFT.ownerOf(tokenId);
     console.log(`Frog ${tokenId} exists. Owner: ${owner}`);
  } catch(e) {
     console.error(`❌ Frog ${tokenId} does NOT exist on this contract!`);
     // Check if we should use another ID
     return;
  }

  const isApproved = await ZetaFrogNFT.isApprovedForAll(signer.address, OMNI_TRAVEL_ADDRESS);
  if (!isApproved) {
      console.log("Approving OmniTravel...");
      const tx = await ZetaFrogNFT.setApprovalForAll(OMNI_TRAVEL_ADDRESS, true);
      await tx.wait();
      console.log("✅ Approved!");
  } else {
      console.log("✅ Already approved.");
  }

  // 3. Call Backend: Check Eligibility
  console.log("\nChecking eligibility via API...");
  try {
      const res = await fetch(`${API_BASE_URL}/cross-chain/can-travel/${tokenId}?targetChainId=${targetChainId}`);
      const data = await res.json();
      console.log(`Eligibility Check:`, data);
      
      if (!data.data.canStart) {
          console.error("❌ Backend says cannot start!");
          return;
      }
  } catch (e) {
      console.error(`❌ API Error: ${e.message}`);
      return;
  }

  // 4. Send Blockchain Transaction
  console.log("\nSending StartCrossChainTravel transaction...");
  const provisions = hre.ethers.parseEther("0.002"); // Test amount
  
  try {
      const tx = await OmniTravel.startCrossChainTravel(
          tokenId,
          targetChainId,
          duration,
          { value: provisions }
      );
      console.log(`Transaction submitted: ${tx.hash}`);
      
      console.log("Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
      
      // Calculate messageId (simplified locally or assume backend handles it if we just pass hash? No, frontend passes messageId)
      // The frontend uses the *transaction hash* as messageId in the notify call?
      // Re-reading Form: `const messageId = hash;` 
      // YES! The frontend currently sends the txHash as the messageId.
      const messageId = tx.hash;

      // 5. Call Backend: Create Travel Record
      console.log("\nCreating travel record via API...");
      const createRes = await fetch(`${API_BASE_URL}/cross-chain/travel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              frogId,
              tokenId,
              targetChainId,
              duration,
              ownerAddress: signer.address
          })
      });
      const createData = await createRes.json();
      console.log("Create Response:", createData);
      
      if (!createData.data || !createData.data.travelId) {
          console.error("❌ Failed to create travel record!");
          return;
      }
      
      const travelId = createData.data.travelId;
      console.log(`✅ Travel Record Created: ID ${travelId}`);
      
      // 6. Call Backend: Notify Started
      console.log("\nNotifying started via API...");
      const notifyRes = await fetch(`${API_BASE_URL}/cross-chain/travel/${travelId}/started`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              messageId,
              txHash: tx.hash
          })
      });
      const notifyData = await notifyRes.json();
      console.log("Notify Response:", notifyData);
      console.log("✅ Flow Complete!");

  } catch (e) {
      console.error(`❌ Transaction or Flow failed: ${e.message}`);
      if (e.data) console.error(e.data);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
