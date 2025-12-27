// backend/src/services/travel.service.ts
// TypeScript migration of travel.service.js

import { PrismaClient, TravelStatus } from '@prisma/client';
import { ethers, Contract, JsonRpcProvider, Wallet } from 'ethers';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Type definitions
interface WalletObservation {
    transactions: any[];
    totalTxCount: number;
    totalValueWei: string;
    notableEvents: NotableEvent[];
    balance?: string;
    source: 'API' | 'RPC' | 'CHAIN_EXPLORATION' | 'MOCK';
    isRandomExploration?: boolean;
}

interface NotableEvent {
    type: string;
    hash?: string;
    value?: string;
    chainName?: string;
    latestBlock?: number;
    blockTxCount?: number;
    timestamp?: number;
}

interface Frog {
    id: number;
    tokenId: number;
    name: string;
    ownerAddress: string;
}

interface Travel {
    id: number;
    frog: Frog;
    targetWallet: string;
    chainId: number;
    startTime: Date;
    endTime: Date;
    status: TravelStatus;
}

interface TravelCompletionResult {
    journalHash: string;
    souvenirId: number;
}

// Chain explorer URLs mapping
const EXPLORER_API_URLS: Record<number, string> = {
    1: 'https://api.etherscan.io',
    5: 'https://api-goerli.etherscan.io',
    11155111: 'https://api-sepolia.etherscan.io',
    137: 'https://api.polygonscan.com',
    56: 'https://api.bscscan.com',
    7001: 'https://zetachain-athens.blockscout.com'
};

const CHAIN_NAMES: Record<number, string> = {
    7001: 'ZetaChain Athens',
    11155111: 'Ethereum Sepolia',
    97: 'BSC Testnet',
    80002: 'Polygon Amoy'
};

class TravelService {
    private provider: JsonRpcProvider;
    private wallet: Wallet | null;
    private frogContract: Contract;
    private souvenirContract: Contract;

    constructor() {
        const rpcUrl = config.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/tendermint';
        this.provider = new ethers.JsonRpcProvider(rpcUrl);

        const privateKey = config.RELAYER_PRIVATE_KEY;
        if (!privateKey) {
            logger.warn('[TravelService] No private key found. Read-only mode.');
            this.wallet = null;
        } else {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
        }

        // Load contract ABIs
        const frogABI = require('../abi/ZetaFrogNFT.json');
        const souvenirABI = require('../abi/SouvenirNFT.json');

        // Initialize contracts
        this.frogContract = new ethers.Contract(
            config.ZETAFROG_NFT_ADDRESS || '',
            frogABI,
            this.wallet || this.provider
        );

        this.souvenirContract = new ethers.Contract(
            config.SOUVENIR_NFT_ADDRESS || '',
            souvenirABI,
            this.wallet || this.provider
        );
    }

    /**
     * Scan and process pending travels
     */
    async processPendingTravels(): Promise<void> {
        try {
            const now = new Date();

            const pendingTravels = await prisma.travel.findMany({
                where: {
                    status: 'Active',
                    endTime: { lte: now }
                },
                include: { frog: true }
            });

            logger.info(`[TravelService] Found ${pendingTravels.length} pending travels`);

            for (const travel of pendingTravels) {
                try {
                    await this.completeTravel(travel.id);
                } catch (error: any) {
                    logger.error(`[TravelService] Failed to complete travel ${travel.id}:`, error.message);

                    await prisma.travel.update({
                        where: { id: travel.id },
                        data: { status: 'Failed' }
                    });
                }
            }
        } catch (error: any) {
            logger.error('[TravelService] Error processing pending travels:', error);
        }
    }

    /**
     * Complete a single travel
     */
    async completeTravel(travelId: number): Promise<TravelCompletionResult> {
        logger.info(`[TravelService] Starting completion for travel ${travelId}`);

        const travel = await prisma.travel.findUnique({
            where: { id: travelId },
            include: { frog: true }
        });

        if (!travel || travel.status !== 'Active') {
            throw new Error('Invalid travel or already processed');
        }

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
                    transactions: walletData.transactions as any,
                    totalTxCount: walletData.totalTxCount,
                    totalValueWei: walletData.totalValueWei,
                    notableEvents: (walletData.notableEvents || []) as any,
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

            if (shouldMintSouvenir && this.wallet) {
                const rarityRoll = Math.floor(Math.random() * 100);
                logger.info(`[TravelService] Minting souvenir with rarity roll: ${rarityRoll}`);

                const tx = await this.souvenirContract.mintSouvenir(
                    travel.frog.ownerAddress,
                    travel.frog.tokenId,
                    rarityRoll
                );
                const receipt = await tx.wait();

                // Extract souvenir ID from event
                const eventSignature = 'SouvenirMinted(uint256,uint256,address,uint8,string)';
                const eventTopic = ethers.id(eventSignature);
                const event = receipt.logs.find((log: any) => log.topics[0] === eventTopic);

                if (event) {
                    souvenirId = Number(BigInt(event.topics[1]));
                    logger.info(`[TravelService] Souvenir minted: ${souvenirId}`);
                }
            }

            // 6. Complete travel on contract
            if (this.wallet) {
                logger.info(`[TravelService] Calling completeTravel on contract...`);
                const tx = await this.frogContract.completeTravel(
                    travel.frog.tokenId,
                    journalHash,
                    souvenirId
                );
                await tx.wait();
            }

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

            logger.info(`[TravelService] Travel ${travelId} completed successfully`);
            return { journalHash, souvenirId };

        } catch (error) {
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
    async observeWallet(
        walletAddress: string,
        chainId: number,
        startTime: Date,
        endTime: Date
    ): Promise<WalletObservation> {
        logger.info(`[TravelService] Observing wallet ${walletAddress} on chain ${chainId}`);

        // Handle zero address (random exploration)
        if (walletAddress.toLowerCase() === '0x0000000000000000000000000000000000000000') {
            logger.info('[TravelService] Zero address detected - observing chain activity');
            return this.observeChainActivity(chainId);
        }

        // Try API first
        const apiResult = await this.observeWalletViaAPI(walletAddress, chainId, startTime, endTime);
        if (apiResult) {
            logger.info('[TravelService] Successfully fetched data via API');
            return apiResult;
        }

        // Fallback to RPC
        logger.info('[TravelService] API failed, falling back to RPC observation');
        return this.observeWalletViaRPC(walletAddress, chainId);
    }

    /**
     * Observe wallet via blockchain explorer API
     */
    private async observeWalletViaAPI(
        walletAddress: string,
        chainId: number,
        startTime: Date,
        endTime: Date
    ): Promise<WalletObservation | null> {
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
                timeout: 8000
            });

            if (response.data.status !== '1') {
                logger.warn('[TravelService] API returned error status');
                return null;
            }

            const transactions = response.data.result;

            // Filter by time range
            const startTimestamp = Math.floor(startTime.getTime() / 1000);
            const endTimestamp = Math.floor(endTime.getTime() / 1000);

            const filteredTxs = transactions.filter((tx: any) => {
                const txTime = parseInt(tx.timeStamp);
                return txTime >= startTimestamp && txTime <= endTimestamp;
            });

            // Calculate statistics
            let totalValueWei = BigInt(0);
            const notableEvents: NotableEvent[] = [];

            for (const tx of filteredTxs.slice(0, 50)) {
                totalValueWei += BigInt(tx.value || 0);

                if (BigInt(tx.value) > ethers.parseEther('0.1')) {
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
                notableEvents,
                source: 'API'
            };

        } catch (error: any) {
            logger.error('[TravelService] API call failed:', error.message);
            return null;
        }
    }

    /**
     * Observe wallet via RPC (fallback)
     */
    private async observeWalletViaRPC(
        walletAddress: string,
        chainId: number
    ): Promise<WalletObservation> {
        try {
            logger.info('[TravelService] Querying wallet via RPC...');

            const balance = await this.provider.getBalance(walletAddress);
            const txCount = await this.provider.getTransactionCount(walletAddress);
            const latestBlock = await this.provider.getBlockNumber();
            const blocksToCheck = Math.min(100, latestBlock);

            let foundTxCount = 0;
            let totalValue = BigInt(0);
            const notableEvents: NotableEvent[] = [];

            // Sample recent blocks
            for (let i = 0; i < blocksToCheck && i < 10; i += 10) {
                try {
                    const blockNum = latestBlock - i;
                    const block = await this.provider.getBlock(blockNum, true);

                    if (block && block.transactions) {
                        for (const txHash of block.transactions) {
                            if (typeof txHash === 'string') {
                                const tx = await this.provider.getTransaction(txHash);
                                if (tx && (
                                    tx.from?.toLowerCase() === walletAddress.toLowerCase() ||
                                    tx.to?.toLowerCase() === walletAddress.toLowerCase()
                                )) {
                                    foundTxCount++;
                                    totalValue += tx.value || BigInt(0);

                                    if (tx.value > ethers.parseEther('0.1')) {
                                        notableEvents.push({
                                            type: 'large_transfer',
                                            hash: tx.hash,
                                            value: tx.value.toString()
                                        });
                                    }
                                }
                            }
                        }
                    }
                } catch {
                    continue;
                }
            }

            return {
                transactions: [],
                totalTxCount: Math.max(txCount, foundTxCount),
                totalValueWei: totalValue.toString(),
                balance: balance.toString(),
                notableEvents,
                source: 'RPC'
            };

        } catch (error: any) {
            logger.error('[TravelService] RPC observation failed:', error.message);
            return this.getMockWalletData();
        }
    }

    /**
     * Observe general chain activity for random exploration
     */
    private async observeChainActivity(chainId: number): Promise<WalletObservation> {
        try {
            logger.info('[TravelService] Observing chain activity for random exploration');

            const latestBlock = await this.provider.getBlockNumber();
            const block = await this.provider.getBlock(latestBlock, true);

            let txCount = 0;

            if (block && block.transactions) {
                txCount = block.transactions.length;
            }

            return {
                transactions: [],
                totalTxCount: txCount,
                totalValueWei: '0',
                notableEvents: [{
                    type: 'chain_exploration',
                    chainName: CHAIN_NAMES[chainId] || `Chain ${chainId}`,
                    latestBlock: latestBlock,
                    blockTxCount: txCount,
                    timestamp: block?.timestamp || Math.floor(Date.now() / 1000)
                }],
                source: 'CHAIN_EXPLORATION',
                isRandomExploration: true
            };

        } catch (error: any) {
            logger.error('[TravelService] Chain observation failed:', error.message);
            return this.getMockWalletData();
        }
    }

    /**
     * Get mock wallet data (fallback)
     */
    private getMockWalletData(): WalletObservation {
        return {
            transactions: [],
            totalTxCount: Math.floor(Math.random() * 20) + 5,
            totalValueWei: ethers.parseEther((Math.random() * 10).toFixed(4)).toString(),
            notableEvents: [],
            source: 'MOCK'
        };
    }

    /**
     * Generate AI journal
     */
    private async generateJournal(frog: Frog, walletData: WalletObservation): Promise<string> {
        const txCount = walletData.totalTxCount;
        const totalValue = ethers.formatEther(walletData.totalValueWei || '0');
        const dataSource = walletData.source;
        const isRandomExploration = walletData.isRandomExploration || false;

        let prompt: string;

        if (isRandomExploration && walletData.notableEvents.length > 0) {
            const chainEvent = walletData.notableEvents[0];
            prompt = `你是一只名叫 ${frog.name} 的旅行青蛙，刚刚完成了一次探索 ${chainEvent.chainName} 区块链的冒险。

探索数据:
- 探索的链: ${chainEvent.chainName}
- 最新区块高度: ${chainEvent.latestBlock}
- 该区块交易数: ${chainEvent.blockTxCount} 笔
- 链上氛围: ${(chainEvent.blockTxCount || 0) > 50 ? '非常繁忙' : (chainEvent.blockTxCount || 0) > 20 ? '比较活跃' : '相对安静'}

请以第一人称（青蛙的视角）写一篇100-150字的随机探险日记。`;
        } else if (dataSource === 'RPC' && walletData.balance) {
            const balance = ethers.formatEther(walletData.balance);
            prompt = `你是一只名叫 ${frog.name} 的旅行青蛙，刚刚完成了一次观察神秘地址的旅行。

旅行数据:
- 地址活跃度: ${txCount} 次历史互动
- 当前财富: ${parseFloat(balance) > 0 ? '富有' : '朴素'}

请以第一人称（青蛙的视角）写一篇100-150字的旅行日记。`;
        } else {
            prompt = `你是一只名叫 ${frog.name} 的旅行青蛙，刚刚完成了一次观察区块链钱包的旅行。

旅行数据:
- 交易数量: ${txCount} 笔
- 总交易额: ${totalValue} ETH

请以第一人称(青蛙的视角)写一篇100-150字的旅行日记。`;
        }

        try {
            const response = await axios.post(
                config.QWEN_BASE_URL + '/chat/completions',
                {
                    model: 'qwen-turbo',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 500,
                    temperature: 0.9
                },
                {
                    headers: {
                        'Authorization': `Bearer ${config.QWEN_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            const journal = response.data.choices[0].message.content.trim();
            logger.info('[TravelService] AI journal generated');
            return journal;

        } catch (error: any) {
            logger.error('[TravelService] Error generating journal:', error.message);

            // Fallback journal
            if (isRandomExploration) {
                const chainEvent = walletData.notableEvents?.[0];
                return `今天${frog.name}去了一个神秘的数字世界冒险！看到${chainEvent?.blockTxCount || '很多'}个忙碌的身影在穿梭。真是一次奇妙的探险！`;
            }

            const fallbackJournals = [
                `今天我去了一个神秘的地方观察，看到了 ${txCount} 个忙碌的身影。${frog.name} 觉得这个世界真奇妙！`,
                `呱呱~ ${frog.name} 今天的旅行充满惊喜！遇到了许多勤劳的小伙伴，一共有 ${txCount} 次呢！`,
                `亲爱的日记，今天 ${frog.name} 去了一个繁华的市集，看到 ${txCount} 次交易，真热闹啊！`
            ];
            return fallbackJournals[Math.floor(Math.random() * fallbackJournals.length)];
        }
    }

    /**
     * Upload to IPFS
     */
    private async uploadToIPFS(content: string): Promise<string> {
        try {
            const response = await axios.post(
                'https://api.pinata.cloud/pinning/pinJSONToIPFS',
                {
                    pinataContent: { journal: content, timestamp: Date.now() },
                    pinataMetadata: { name: `frog-journal-${Date.now()}` }
                },
                {
                    headers: {
                        'pinata_api_key': config.PINATA_API_KEY,
                        'pinata_secret_api_key': config.PINATA_SECRET_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            const hash = response.data.IpfsHash;
            logger.info(`[TravelService] Uploaded to IPFS: ${hash}`);
            return hash;

        } catch (error: any) {
            logger.error('[TravelService] Error uploading to IPFS:', error.message);

            // Return mock hash
            const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
            return mockHash;
        }
    }

    /**
     * Get blockchain explorer API URL
     */
    private getExplorerApiUrl(chainId: number): string {
        return EXPLORER_API_URLS[chainId] || EXPLORER_API_URLS[1];
    }
}

export const travelService = new TravelService();
export default travelService;
