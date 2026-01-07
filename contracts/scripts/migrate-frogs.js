/**
 * Migrate Frogs from Old Contract to New Upgradeable Contract
 * 
 * This script reads frog data from the old contract and migrates it
 * to the new upgradeable contract.
 * 
 * Usage:
 *   npx hardhat run scripts/migrate-frogs.js --network zetaAthens
 */

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("========================================");
    console.log("Migrate Frogs to Upgradeable Contract");
    console.log("========================================");
    console.log("Network:", network.name);
    console.log("Migrator:", deployer.address);
    console.log("");

    // Contract addresses
    const OLD_NFT_ADDRESS = "0x76e7baA23fce77DA7Edbea58D8B888128D47A1Ff";
    const NEW_PROXY_ADDRESS = "0x0721CDff3291a1Dd2af28633B5dEE5427553F09E"; // Deployed upgradeable proxy

    if (!NEW_PROXY_ADDRESS) {
        console.error("❌ Please set NEW_PROXY_ADDRESS first!");
        console.error("   Deploy the upgradeable contract using deploy-upgradeable.js");
        process.exit(1);
    }

    // Get contracts
    const OldNFT = await ethers.getContractFactory("ZetaFrogNFT");
    const oldNft = OldNFT.attach(OLD_NFT_ADDRESS);
    
    const NewNFT = await ethers.getContractFactory("ZetaFrogNFTUpgradeable");
    const newNft = NewNFT.attach(NEW_PROXY_ADDRESS);

    // Check migration status
    const migrationCompleted = await newNft.migrationCompleted();
    if (migrationCompleted) {
        console.error("❌ Migration has already been completed!");
        process.exit(1);
    }

    // Read data from old contract
    console.log("Reading data from old contract:", OLD_NFT_ADDRESS);
    const totalSupply = await oldNft.totalSupply();
    console.log("Total frogs to migrate:", totalSupply.toString());
    console.log("");

    if (totalSupply === 0n) {
        console.log("No frogs to migrate.");
        return;
    }

    // Collect frog data
    console.log("Collecting frog data...");
    const frogsToMigrate = [];

    for (let tokenId = 0; tokenId < totalSupply; tokenId++) {
        try {
            const owner = await oldNft.ownerOf(tokenId);
            const frog = await oldNft.getFrog(tokenId);
            
            frogsToMigrate.push({
                tokenId: tokenId,
                owner: owner,
                name: frog.name,
                birthday: frog.birthday,
                totalTravels: frog.totalTravels,
                xp: frog.xp,
                level: frog.level
            });
            
            console.log(`  Frog ${tokenId}: ${frog.name} (owner: ${owner.slice(0, 10)}...)`);
        } catch (e) {
            console.log(`  Frog ${tokenId}: Error - ${e.message.substring(0, 50)}`);
        }
    }
    console.log("");

    if (frogsToMigrate.length === 0) {
        console.log("No valid frogs to migrate.");
        return;
    }

    // Save snapshot before migration
    const snapshotFile = path.join(__dirname, "..", "migration-snapshot.json");
    fs.writeFileSync(snapshotFile, JSON.stringify({
        oldContract: OLD_NFT_ADDRESS,
        newContract: NEW_PROXY_ADDRESS,
        frogs: frogsToMigrate,
        migratedAt: new Date().toISOString()
    }, null, 2));
    console.log("Snapshot saved to:", snapshotFile);
    console.log("");

    // Migrate frogs in batches
    console.log("Starting migration...");
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < frogsToMigrate.length; i += BATCH_SIZE) {
        const batch = frogsToMigrate.slice(i, i + BATCH_SIZE);
        console.log(`Migrating batch ${Math.floor(i/BATCH_SIZE) + 1} (${batch.length} frogs)...`);
        
        try {
            const tx = await newNft.batchMigrateFrogs(
                batch.map(f => f.tokenId),
                batch.map(f => f.owner),
                batch.map(f => f.name),
                batch.map(f => f.birthday),
                batch.map(f => f.totalTravels),
                batch.map(f => f.xp),
                batch.map(f => f.level)
            );
            await tx.wait();
            console.log(`  ✅ Batch migrated`);
        } catch (e) {
            console.error(`  ❌ Batch failed:`, e.message);
            
            // Try individual migration
            console.log("  Trying individual migration...");
            for (const frog of batch) {
                try {
                    const tx = await newNft.migrateFrog(
                        frog.tokenId,
                        frog.owner,
                        frog.name,
                        frog.birthday,
                        frog.totalTravels,
                        frog.xp,
                        frog.level
                    );
                    await tx.wait();
                    console.log(`    ✅ Frog ${frog.tokenId} migrated`);
                } catch (e2) {
                    console.error(`    ❌ Frog ${frog.tokenId} failed:`, e2.message.substring(0, 50));
                }
            }
        }
    }
    console.log("");

    // Verify migration
    console.log("Verifying migration...");
    const newTotalSupply = await newNft.totalSupply();
    console.log("New contract total supply:", newTotalSupply.toString());

    for (const frog of frogsToMigrate) {
        try {
            const newOwner = await newNft.ownerOf(frog.tokenId);
            if (newOwner.toLowerCase() === frog.owner.toLowerCase()) {
                console.log(`  ✅ Frog ${frog.tokenId}: verified`);
            } else {
                console.log(`  ❌ Frog ${frog.tokenId}: owner mismatch`);
            }
        } catch (e) {
            console.log(`  ❌ Frog ${frog.tokenId}: not found`);
        }
    }
    console.log("");

    // Ask to complete migration
    console.log("========================================");
    console.log("Migration complete!");
    console.log("");
    console.log("📋 Next Steps:");
    console.log("1. Verify all frogs are migrated correctly");
    console.log("2. Update config to use new proxy address:", NEW_PROXY_ADDRESS);
    console.log("3. Call completeMigration() to finalize");
    console.log("");
    console.log("To complete migration, run:");
    console.log(`  npx hardhat run scripts/complete-migration.js --network ${network.name}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
