const { PrismaClient } = require('@prisma/client');
const { ethers } = require('ethers');
const axios = require('axios');

const prisma = new PrismaClient();

class TravelService {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.BACKEND_PRIVATE_KEY, this.provider);

        // Load contract ABIs
        const frogABI = require('../abi/ZetaFrogNFT.json');
        const souvenirABI = require('../abi/SouvenirNFT.json');

        // Initialize contract instances
        this.frogContract = new ethers.Contract(
            process.env.ZETAFROG_NFT_ADDRESS,
            frogABI,
            this.wallet
        );

        this.souvenirContract = new ethers.Contract(
            process.env.SOUVENIR_NFT_ADDRESS,
            souvenirABI,
            this.wallet
        );
    }

    /**
     * Scan and process pending travels
     */
    async processPendingTravels() {
        try {
            const now = new Date();

            // Find travels that have ended but not completed
            const pendingTravels = await prisma.travel.findMany({
                where: {
                    status: 'Active',
                    endTime: { lte: now }
                },
                include: { frog: true }
            });

            console.log(`[TravelService] Found ${pendingTravels.length} pending travels`);

            for (const travel of pendingTravels) {
                try {
                    await this.completeTravel(travel.id);
                } catch (error) {
                    console.error(`[TravelService] Failed to complete travel ${travel.id}:`, error.message);

                    // Mark as failed
                    await prisma.travel.update({
                        where: { id: travel.id },
                        data: { status: 'Failed' }
                    });
                }
            }
        } catch (error) {
            console.error('[TravelService] Error processing pending travels:', error);
        }
    }

    /**
     * Complete a single travel
     */
    async completeTravel(travelId) {
        console.log(`[TravelService] Starting completion for travel ${travelId}`);

        const travel = await prisma.travel.findUnique({
            where: { id: travelId },
            include: { frog: true }
        });

        if (!travel || travel.status !== 'Active') {
            throw new Error('Invalid travel or already processed');
        }

        // Update status to processing
        await prisma.travel.update({
            where: { id: travelId },
            data: { status: 'Processing' }
        });

        try {
            // 1. Observe target wallet
            const walletData = await this.observeWallet(
                travel.targetWallet,
                travel.chainId,
                travel.startTime,
                travel.endTime
            );

            // 2. Save observation data
            await prisma.walletObservation.create({
                data: {
                    travelId: travel.id,
                    walletAddress: travel.targetWallet,
                    chainId: travel.chainId,
                    transactions: walletData.transactions,
                    totalTxCount: walletData.totalTxCount,
                    totalValueWei: walletData.totalValueWei,
                    notableEvents: walletData.notableEvents || {},
                    observedFrom: travel.startTime,
                    observedTo: travel.endTime
                }
            });

            // 3. Generate AI journal
            const journal = await this.generateJournal(travel.frog, walletData);

            // 4. Upload to IPFS
            const journalHash = await this.uploadToIPFS(journal);

            // 5. Mint souvenir (30% chance)
            let souvenirId = 0;
            const shouldMintSouvenir = Math.random() < 0.3;

            if (shouldMintSouvenir) {
                const rarityRoll = Math.floor(Math.random() * 100);
                console.log(`[TravelService] Minting souvenir with rarity roll: ${rarityRoll}`);

                const tx = await this.souvenirContract.mintSouvenir(
                    travel.frog.ownerAddress,
                    travel.frog.tokenId,
                    rarityRoll
                );
                const receipt = await tx.wait();

                // Extract souvenir ID from event
                const eventSignature = 'SouvenirMinted(uint256,uint256,address,uint8,string)';
                const eventTopic = ethers.id(eventSignature);
                const event = receipt.logs.find(log => log.topics[0] === eventTopic);

                if (event) {
                    souvenirId = Number(ethers.getBigInt(event.topics[1]));
                    console.log(`[TravelService] Souvenir minted: ${souvenirId}`);
                }
            }

            // 6. Complete travel on contract
            console.log(`[TravelService] Calling completeTravel on contract...`);
            const tx = await this.frogContract.completeTravel(
                travel.frog.tokenId,
                journalHash,
                souvenirId
            );
            await tx.wait();

            // 7. Update database
            await prisma.travel.update({
                where: { id: travelId },
                data: {
                    status: 'Completed',
                    observedTxCount: walletData.totalTxCount,
                    observedTotalValue: walletData.totalValueWei,
                    journalHash: journalHash,
                    journalContent: journal,
                    souvenirId: souvenirId || null,
                    completedAt: new Date()
                }
            });

            console.log(`[TravelService] Travel ${travelId} completed successfully`);
            return { journalHash, souvenirId };

        } catch (error) {
            // Rollback to active status for retry
            await prisma.travel.update({
                where: { id: travelId },
                data: { status: 'Active' }
            });
            throw error;
        }
    }

    /**
     * Observe wallet activity
     */
    async observeWallet(walletAddress, chainId, startTime, endTime) {
        console.log(`[TravelService] Observing wallet ${walletAddress} on chain ${chainId}`);

        const apiKey = process.env.ETHERSCAN_API_KEY;
        const baseUrl = this.getExplorerApiUrl(chainId);

        try {
            const response = await axios.get(`${baseUrl}/api`, {
                params: {
                    module: 'account',
                    action: 'txlist',
                    address: walletAddress,
                    startblock: 0,
                    endblock: 99999999,
                    sort: 'desc',
                    apikey: apiKey
                },
                timeout: 10000
            });

            if (response.data.status !== '1') {
                console.warn('[TravelService] Failed to fetch transactions, using mock data');
                return this.getMockWalletData();
            }

            const transactions = response.data.result;

            // Filter by time range
            const startTimestamp = Math.floor(startTime.getTime() / 1000);
            const endTimestamp = Math.floor(endTime.getTime() / 1000);

            const filteredTxs = transactions.filter(tx => {
                const txTime = parseInt(tx.timeStamp);
                return txTime >= startTimestamp && txTime <= endTimestamp;
            });

            // Calculate statistics
            let totalValueWei = BigInt(0);
            const notableEvents = [];

            for (const tx of filteredTxs.slice(0, 50)) {
                totalValueWei += BigInt(tx.value || 0);

                // Identify large transactions
                if (BigInt(tx.value) > ethers.parseEther('1')) {
                    notableEvents.push({
                        type: 'large_transfer',
                        hash: tx.hash,
                        value: tx.value
                    });
                }
            }

            return {
                transactions: filteredTxs.slice(0, 50),
                totalTxCount: filteredTxs.length,
                totalValueWei: totalValueWei.toString(),
                notableEvents
            };

        } catch (error) {
            console.error('[TravelService] Error observing wallet:', error.message);
            return this.getMockWalletData();
        }
    }

    /**
     * Get mock wallet data (fallback)
     */
    getMockWalletData() {
        return {
            transactions: [],
            totalTxCount: Math.floor(Math.random() * 20) + 5,
            totalValueWei: ethers.parseEther((Math.random() * 10).toFixed(4)).toString(),
            notableEvents: []
        };
    }

    /**
     * Generate AI journal
     */
    async generateJournal(frog, walletData) {
        const txCount = walletData.totalTxCount;
        const totalValue = ethers.formatEther(walletData.totalValueWei || '0');

        const prompt = `你是一只名叫 ${frog.name} 的旅行青蛙，刚刚完成了一次观察区块链钱包的旅行。

旅行数据:
- 交易数量: ${txCount} 笔
- 总交易额: ${totalValue} ETH
- 特殊事件: ${walletData.notableEvents.length} 个

请以第一人称(青蛙的视角)写一篇100-200字的旅行日记，描述你观察到的有趣现象。
要求: 温馨可爱，富有想象力，不要直接提及技术术语，要像童话故事一样。`;

        try {
            const response = await axios.post(
                'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
                {
                    model: 'qwen-turbo',
                    input: { prompt },
                    parameters: {
                        max_tokens: 500,
                        temperature: 0.8
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            const journal = response.data.output.text.trim();
            console.log('[TravelService] AI journal generated');
            return journal;

        } catch (error) {
            console.error('[TravelService] Error generating journal:', error.message);

            // Fallback journal
            const fallbackJournals = [
                `今天我去了一个神秘的地方观察，看到了 ${txCount} 个忙碌的身影在数字世界中穿梭。${frog.name} 觉得这个世界真奇妙！`,
                `呱呱~ ${frog.name} 今天的旅行充满惊喜！遇到了许多勤劳的小伙伴，他们搬运着闪闪发光的宝藏，一共有 ${txCount} 次呢！`,
                `亲爱的日记，今天 ${frog.name} 去了一个繁华的市集，看到很多人在交换宝物。数了数，一共看到 ${txCount} 次交易，真热闹啊！`
            ];

            return fallbackJournals[Math.floor(Math.random() * fallbackJournals.length)];
        }
    }

    /**
     * Upload to IPFS
     */
    async uploadToIPFS(content) {
        try {
            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                { 
                    pinataContent: { journal: content, timestamp: Date.now() },
                    pinataMetadata: { name: `frog-journal-${Date.now()}` }
                },
                {
                    headers: {
                        'pinata_api_key': process.env.PINATA_API_KEY,
                        'pinata_secret_api_key': process.env.PINATA_SECRET_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            const hash = response.data.IpfsHash;
            console.log(`[TravelService] Uploaded to IPFS: ${hash}`);
            return hash;

        } catch (error) {
            console.error('[TravelService] Error uploading to IPFS:', error.message);

            // Return mock hash
            const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
            return mockHash;
        }
    }

    /**
     * Get blockchain explorer API URL
     */
    getExplorerApiUrl(chainId) {
        const urls = {
            1: 'https://api.etherscan.io',
            5: 'https://api-goerli.etherscan.io',
            11155111: 'https://api-sepolia.etherscan.io',
            137: 'https://api.polygonscan.com',
            56: 'https://api.bscscan.com',
            7001: 'https://zetachain-athens.blockscout.com'
        };

        return urls[chainId] || urls[1];
    }
}

module.exports = new TravelService();