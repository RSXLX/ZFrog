// backend/src/workers/eventListener.ts

import { createPublicClient, http, parseAbiItem } from 'viem';
import { defineChain } from 'viem';
import { prisma } from '../database';
import { FrogStatus, CrossChainStatus } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI } from '../config/contracts';
import { travelP0Service } from '../services/travel/travel-p0.service';
import { ChainKey } from '../config/chains';



const zetachainAthens = defineChain({
    id: config.CHAIN_ID,
    name: 'ZetaFrog Chain',
    nativeCurrency: {
        decimals: 18,
        name: 'ZETA',
        symbol: 'ZETA'
    },
    rpcUrls: {
        default: { http: [config.ZETACHAIN_RPC_URL] },
    },
});

class EventListener {
    private publicClient: any;
    private isRunning = false;
    private lastProcessedBlock: bigint;

    constructor() {
        this.publicClient = createPublicClient({
            chain: zetachainAthens,
            transport: http(config.ZETACHAIN_RPC_URL),
        });
        this.lastProcessedBlock = BigInt(0);
    }

    async start() {
        if (this.isRunning) {
            logger.warn('Event listener already running');
            return;
        }

        logger.info('Event listener starting...');
        this.isRunning = true;

        // 获取当前区块
        const currentBlock = await this.publicClient.getBlockNumber();
        this.lastProcessedBlock = currentBlock - BigInt(5000); // 从 5000 个区块前开始

        logger.info(`Starting scan from block ${this.lastProcessedBlock} to ${currentBlock}`);

        // 首次扫描历史事件
        await this.scanHistoricalEvents();

        // 开始监听新事件
        this.watchNewEvents();

        // DISABLED: Global polling replaced by on-demand checks in API routes
        // 定期扫描（防止遗漏）
        /*
        setInterval(() => {
            logger.info('[EventListener] Triggering scheduled historical scan...');
            this.scanHistoricalEvents();
        }, 30 * 1000); 
        */

        // DISABLED: Self-Healing now triggered on-demand in frog.routes.ts
        // [Self-Healing] Health Check Interval (every 10s)
        /*
        setInterval(() => {
            this.runHealthCheck();
        }, 10 * 1000);
        */

        logger.info('Event listener started successfully');
    }

    private async scanHistoricalEvents() {
        try {
            const currentBlock = await this.publicClient.getBlockNumber();
            const fromBlock = this.lastProcessedBlock + BigInt(1);

            if (fromBlock > currentBlock) {
                // logger.debug(`[EventListener] Up to date. Current block: ${currentBlock}`);
                return;
            }

            logger.info(`[EventListener] Scanning blocks ${fromBlock} to ${currentBlock} (Delta: ${currentBlock - fromBlock})`);

            // 监听 FrogMinted 事件
            const mintLogs = await this.publicClient.getLogs({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                event: parseAbiItem('event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)'),
                fromBlock,
                toBlock: currentBlock,
            });

            for (const log of mintLogs) {
                await this.handleFrogMinted(log);
            }

            // 监听 TravelStarted 事件 - 从 Travel 合约监听
            const travelLogs = await this.publicClient.getLogs({
                address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
                event: parseAbiItem('event TravelStarted(uint256 indexed tokenId, address indexed targetWallet, uint256 targetChainId, uint64 startTime, uint64 endTime, bool isRandom)'),
                fromBlock,
                toBlock: currentBlock,
            });

            if (travelLogs.length > 0) {
                logger.info(`[EventListener] Found ${travelLogs.length} TravelStarted events!`);
            }

            for (const log of travelLogs) {
                await this.handleTravelStarted(log);
            }

            // 监听 TravelCompleted 事件 - 从 Travel 合约监听
            const completedLogs = await this.publicClient.getLogs({
                address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
                event: parseAbiItem('event TravelCompleted(uint256 indexed tokenId, string journalHash, uint256 souvenirId, uint256 timestamp, uint256 xpReward)'),
                fromBlock,
                toBlock: currentBlock,
            });

            for (const log of completedLogs) {
                await this.handleTravelCompleted(log);
            }

            // 监听 SouvenirMinted 事件
            const souvenirLogs = await this.publicClient.getLogs({
                address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
                event: parseAbiItem('event SouvenirMinted(uint256 indexed souvenirId, uint256 indexed frogId, address indexed owner, uint8 rarity, string name)'),
                fromBlock,
                toBlock: currentBlock,
            });

            for (const log of souvenirLogs) {
                await this.handleSouvenirMinted(log);
            }

            // 监听 TravelCancelled 事件 - 从 Travel 合约监听
            const cancelledLogs = await this.publicClient.getLogs({
                address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
                event: parseAbiItem('event TravelCancelled(uint256 indexed tokenId, uint256 timestamp)'),
                fromBlock,
                toBlock: currentBlock,
            });

            for (const log of cancelledLogs) {
                await this.handleTravelCancelled(log);
            }

            // 监听 LevelUp 事件
            const levelUpLogs = await this.publicClient.getLogs({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                event: parseAbiItem('event LevelUp(uint256 indexed tokenId, uint256 newLevel, uint256 timestamp)'),
                fromBlock,
                toBlock: currentBlock,
            });

            for (const log of levelUpLogs) {
                await this.handleLevelUp(log);
            }

            // P1 Fix: 监听 CrossChainTravelStarted 事件 - 从 OmniTravel 合约监听
            const crossChainLogs = await this.publicClient.getLogs({
                address: config.OMNI_TRAVEL_ADDRESS as `0x${string}`,
                event: parseAbiItem('event CrossChainTravelStarted(uint256 indexed tokenId, address indexed owner, uint256 targetChainId, bytes32 messageId, uint64 startTime, uint64 maxDuration)'),
                fromBlock,
                toBlock: currentBlock,
            });

            if (crossChainLogs.length > 0) {
                logger.info(`[EventListener] Found ${crossChainLogs.length} CrossChainTravelStarted events!`);
            }

            for (const log of crossChainLogs) {
                await this.handleCrossChainTravelStarted(log);
            }

            this.lastProcessedBlock = currentBlock;

        } catch (error) {
            logger.error('Error scanning historical events:', error);
        }
    }

    private watchNewEvents() {
        // 监听 FrogMinted
        this.publicClient.watchEvent({
            address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event FrogMinted(address indexed owner, uint256 indexed tokenId, string name, uint256 timestamp)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleFrogMinted(log);
                }
            },
        });

        // 监听 TravelStarted - 从 Travel 合约监听
        this.publicClient.watchEvent({
            address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event TravelStarted(uint256 indexed tokenId, address indexed targetWallet, uint256 targetChainId, uint64 startTime, uint64 endTime, bool isRandom)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleTravelStarted(log);
                }
            },
        });

        // 监听 TravelCompleted - 从 Travel 合约监听
        this.publicClient.watchEvent({
            address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event TravelCompleted(uint256 indexed tokenId, string journalHash, uint256 souvenirId, uint256 timestamp, uint256 xpReward)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleTravelCompleted(log);
                }
            },
        });

        // 监听 TravelCancelled - 从 Travel 合约监听
        this.publicClient.watchEvent({
            address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event TravelCancelled(uint256 indexed tokenId, uint256 timestamp)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleTravelCancelled(log);
                }
            },
        });

        // 监听 LevelUp
        this.publicClient.watchEvent({
            address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event LevelUp(uint256 indexed tokenId, uint256 newLevel, uint256 timestamp)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleLevelUp(log);
                }
            },
        });

        // 监听 SouvenirMinted
        this.publicClient.watchEvent({
            address: config.SOUVENIR_NFT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event SouvenirMinted(uint256 indexed souvenirId, uint256 indexed frogId, address indexed owner, uint8 rarity, string name)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleSouvenirMinted(log);
                }
            },
        });

        logger.info('Watching for new events...');

        // P1 Fix: 监听 CrossChainTravelStarted - 从 OmniTravel 合约监听
        this.publicClient.watchEvent({
            address: config.OMNI_TRAVEL_ADDRESS as `0x${string}`,
            event: parseAbiItem('event CrossChainTravelStarted(uint256 indexed tokenId, address indexed owner, uint256 targetChainId, bytes32 messageId, uint64 startTime, uint64 maxDuration)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleCrossChainTravelStarted(log);
                }
            },
        });
    }

    private async handleFrogMinted(log: any) {
        const { owner, tokenId, name, timestamp } = log.args;
        logger.info(`FrogMinted: tokenId=${tokenId}, owner=${owner}, name=${name}`);

        try {
            const ownerLower = (owner as string).toLowerCase();
            const tokenIdNum = Number(tokenId);

            // 先检查是否已存在该 tokenId 的 frog
            const existingByTokenId = await prisma.frog.findUnique({
                where: { tokenId: tokenIdNum },
            });

            if (existingByTokenId) {
                // 已存在该 tokenId，只更新 owner（NFT 转移场景）
                // 注意：如果 newOwner 已拥有另一只蛙，需要先处理旧蛙
                const existingByOwner = await prisma.frog.findUnique({
                    where: { ownerAddress: ownerLower },
                });

                if (existingByOwner && existingByOwner.tokenId !== tokenIdNum) {
                    // 新 owner 已有别的蛙，这是"单钱包单蛙"冲突
                    // 清空旧蛙的 ownerAddress（转移到临时地址）
                    await prisma.frog.update({
                        where: { id: existingByOwner.id },
                        data: { ownerAddress: `orphaned_${existingByOwner.tokenId}_${Date.now()}` },
                    });
                    logger.warn(`Orphaned frog ${existingByOwner.tokenId} due to owner ${ownerLower} acquiring frog ${tokenIdNum}`);
                }

                await prisma.frog.update({
                    where: { tokenId: tokenIdNum },
                    data: { ownerAddress: ownerLower },
                });
                logger.info(`Frog ${tokenIdNum} owner updated to ${ownerLower}`);
                return;
            }

            // 检查该 owner 是否已有别的 frog（单钱包单蛙规则）
            const existingByOwner = await prisma.frog.findUnique({
                where: { ownerAddress: ownerLower },
            });

            if (existingByOwner) {
                // 该 owner 已有蛙，但 tokenId 不同
                // 可能是链上重复 mint 事件，或者 NFT 被 burn 后重新 mint
                // 更新现有记录的 tokenId 信息
                logger.warn(`Owner ${ownerLower} already has frog ${existingByOwner.tokenId}, new tokenId=${tokenIdNum}`);
                
                // 清空旧蛙的 ownerAddress，为新蛙腾位置
                await prisma.frog.update({
                    where: { id: existingByOwner.id },
                    data: { ownerAddress: `orphaned_${existingByOwner.tokenId}_${Date.now()}` },
                });

                // 创建新蛙
                await prisma.frog.create({
                    data: {
                        tokenId: tokenIdNum,
                        name: name as string,
                        ownerAddress: ownerLower,
                        birthday: new Date(Number(timestamp) * 1000),
                        totalTravels: 0,
                        status: FrogStatus.Idle,
                        xp: 0,
                        level: 1,
                    },
                });
                logger.info(`Frog ${tokenIdNum} created (replaced orphaned frog)`);
                return;
            }

            // 正常创建新蛙
            await prisma.frog.create({
                data: {
                    tokenId: tokenIdNum,
                    name: name as string,
                    ownerAddress: ownerLower,
                    birthday: new Date(Number(timestamp) * 1000),
                    totalTravels: 0,
                    status: FrogStatus.Idle,
                    xp: 0,
                    level: 1,
                },
            });

            logger.info(`Frog ${tokenIdNum} saved in database`);

        } catch (error) {
            logger.error(`Error handling FrogMinted event:`, error);
        }
    }

    private async handleTravelStarted(log: any) {
        // 从Travel合约解析事件，包含 isRandom 字段
        const { tokenId, targetWallet, targetChainId, startTime, endTime, isRandom } = log.args;
        logger.info(`TravelStarted: tokenId=${tokenId}, target=${targetWallet}, chainId=${targetChainId}, isRandom=${isRandom}`);

        try {
            // 查找青蛙
            const frog = await prisma.frog.findUnique({
                where: { tokenId: Number(tokenId) },
            });

            if (!frog) {
                logger.error(`Frog ${tokenId} not found for travel`);
                // 尝试同步青蛙数据
                await this.syncFrog(Number(tokenId));
                return;
            }

            // 检查是否已有相同的旅行记录（检查所有状态，避免重复创建）
            const existingTravel = await prisma.travel.findFirst({
                where: {
                    frogId: frog.id,
                    startTime: new Date(Number(startTime) * 1000),
                    // 移除 status 过滤，检查所有状态
                },
            });

            if (existingTravel) {
                logger.info(`Travel already exists for frog ${tokenId} (ID: ${existingTravel.id}, status: ${existingTravel.status})`);
                return;
            }

            // 更新青蛙状态
            await prisma.frog.update({
                where: { id: frog.id },
                data: { status: FrogStatus.Traveling },
            });

            // 创建旅行记录
            const travel = await prisma.travel.create({
                data: {
                    frogId: frog.id,
                    targetWallet: (targetWallet as string).toLowerCase(),
                    startTime: new Date(Number(startTime) * 1000),
                    endTime: new Date(Number(endTime) * 1000),
                    status: 'Active',
                    chainId: Number(targetChainId),
                    observedTxCount: 0,
                    observedTotalValue: "0",
                    isRandom: Boolean(isRandom), // 直接使用事件中的 isRandom
                },
            });

            logger.info(`Travel started for frog ${tokenId} to chain ${targetChainId} (isRandom: ${isRandom})`);

            // 通知前端更新状态
            try {
                const { notifyTravelStarted } = await import('../websocket');
                notifyTravelStarted(frog.tokenId, {
                    travelId: travel.id,
                    targetWallet: travel.targetWallet,
                    startTime: travel.startTime,
                    endTime: travel.endTime,
                    status: 'Active',
                    chainId: travel.chainId
                });
            } catch (wsError) {
                logger.error('Failed to send WebSocket notification:', wsError);
            }

        } catch (error) {
            logger.error(`Error handling TravelStarted event:`, error);
        }
    }

    /**
     * P1 Fix: Handle CrossChainTravelStarted from OmniTravel contract
     * Auto-creates travel record if frontend failed to do so
     */
    private async handleCrossChainTravelStarted(log: any) {
        const { tokenId, owner, targetChainId, messageId, startTime, maxDuration } = log.args;
        const txHash = log.transactionHash;
        logger.info(`CrossChainTravelStarted: tokenId=${tokenId}, owner=${owner}, chain=${targetChainId}, msgId=${messageId}`);

        try {
            // Get transaction receipt to extract actual gas used
            let gasUsedStr: string | null = null;
            try {
                const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
                if (receipt?.gasUsed) {
                    // Convert gas used to ZETA (assuming gas price from receipt or estimate)
                    const gasPrice = receipt.effectiveGasPrice || BigInt(25_000_000_000); // 25 Gwei default
                    const gasUsedWei = receipt.gasUsed * gasPrice;
                    const gasUsedZeta = Number(gasUsedWei) / 1e18;
                    gasUsedStr = `${gasUsedZeta.toFixed(6)} ZETA`;
                    logger.info(`[Gas] Transaction ${txHash} used ${receipt.gasUsed} gas = ${gasUsedStr}`);
                }
            } catch (gasError) {
                logger.warn(`Failed to get gas usage for tx ${txHash}:`, gasError);
            }

            // Find frog in database
            const frog = await prisma.frog.findUnique({
                where: { tokenId: Number(tokenId) },
            });

            if (!frog) {
                logger.warn(`Frog ${tokenId} not found for cross-chain travel, syncing...`);
                await this.syncFrog(Number(tokenId));
                return;
            }

            // Create or update CrossChainMessage record with gas data
            const chainKeyOUT = targetChainId === 97 ? 'BSC_TESTNET' : targetChainId === 11155111 ? 'ETH_SEPOLIA' : 'ZETACHAIN_ATHENS';
            await prisma.crossChainMessage.upsert({
                where: { messageId: messageId as string },
                update: {
                    sendTxHash: txHash as string,
                    gasUsed: gasUsedStr,
                    status: 'CONFIRMED',
                    confirmedAt: new Date(),
                },
                create: {
                    messageId: messageId as string,
                    tokenId: Number(tokenId),
                    sourceChain: 'ZETACHAIN_ATHENS',
                    targetChain: chainKeyOUT as any,
                    direction: 'OUT',
                    status: 'CONFIRMED',
                    sendTxHash: txHash as string,
                    gasUsed: gasUsedStr,
                    payload: { owner, targetChainId: Number(targetChainId), startTime: Number(startTime), maxDuration: Number(maxDuration) },
                    sentAt: new Date(Number(startTime) * 1000),
                    confirmedAt: new Date(),
                },
            });

            // Check if travel record already exists (by txHash or messageId)
            const existingTravel = await prisma.travel.findFirst({
                where: {
                    OR: [
                        { startTxHash: txHash as string },
                        { crossChainMessageId: messageId as string },
                        {
                            frogId: frog.id,
                            startTime: new Date(Number(startTime) * 1000),
                            isCrossChain: true,
                        }
                    ]
                },
            });

            if (existingTravel) {
                logger.info(`Cross-chain travel already exists for frog ${tokenId} (ID: ${existingTravel.id})`);
                // Update messageId and txHash if missing
                if (!existingTravel.crossChainMessageId || !existingTravel.startTxHash) {
                    await prisma.travel.update({
                        where: { id: existingTravel.id },
                        data: {
                            crossChainMessageId: messageId as string,
                            startTxHash: txHash as string,
                        }
                    });
                }
                return;
            }

            // Update frog status
            await prisma.frog.update({
                where: { id: frog.id },
                data: { status: 'CrossChainLocked' as FrogStatus },
            });

            // Create cross-chain travel record
            // Note: targetWallet will be populated during exploration, not at travel creation
            const endTime = new Date((Number(startTime) + Number(maxDuration)) * 1000);
            const travel = await prisma.travel.create({
                data: {
                    frogId: frog.id,
                    // Use zero address as placeholder - actual targets are selected during exploration
                    targetWallet: '0x0000000000000000000000000000000000000000',
                    startTime: new Date(Number(startTime) * 1000),
                    endTime: endTime,
                    status: 'Active',
                    chainId: Number(targetChainId),
                    isCrossChain: true,
                    crossChainMessageId: messageId as string,
                    crossChainStatus: CrossChainStatus.CROSSING_OUT,
                    startTxHash: txHash as string,
                    observedTxCount: 0,
                    observedTotalValue: "0",
                    isRandom: true, // Cross-chain exploration uses random targets
                },
            });

            logger.info(`[P1 Fix] Auto-created cross-chain travel ${travel.id} for frog ${tokenId} to chain ${targetChainId}`);

            // Notify frontend
            try {
                const { notifyCrossChainTravelStarted } = await import('../websocket');
                if (notifyCrossChainTravelStarted) {
                    notifyCrossChainTravelStarted(frog.tokenId, {
                        travelId: travel.id,
                        targetChainId: Number(targetChainId),
                        messageId: messageId as string,
                        duration: Number(maxDuration),
                    });
                }
            } catch (wsError) {
                logger.warn('WebSocket notification failed for cross-chain travel:', wsError);
            }

        } catch (error) {
            logger.error(`Error handling CrossChainTravelStarted event:`, error);
        }
    }

    private async handleTravelCompleted(log: any) {
        const { tokenId, journalHash, souvenirId, timestamp } = log.args;
        logger.info(`TravelCompleted: tokenId=${tokenId}, journalHash=${journalHash}`);

        try {
            const frog = await prisma.frog.findUnique({
                where: { tokenId: Number(tokenId) },
            });

            if (!frog) {
                logger.error(`Frog ${tokenId} not found for travel completion`);
                return;
            }

            // 更新青蛙状态和旅行次数（基于链上事件统计，这是唯一递增 totalTravels 的地方）
            await prisma.frog.update({
                where: { id: frog.id },
                data: {
                    status: FrogStatus.Idle,
                    totalTravels: { increment: 1 },
                },
            });

            // 更新活跃旅行记录并触发统计更新
            const activeTravel = await prisma.travel.findFirst({
                where: {
                    frogId: frog.id,
                    status: 'Active',
                },
                orderBy: { startTime: 'desc' },
            });

            if (activeTravel) {
                // 查找纪念品的数据库主键 ID，以避免 P2003 外键约束错误
                let dbSouvenirId = null;
                if (souvenirId && Number(souvenirId) > 0) {
                    const dbSouvenir = await prisma.souvenir.findFirst({
                        where: { tokenId: Number(souvenirId) }
                    });
                    if (dbSouvenir) {
                        dbSouvenirId = dbSouvenir.id;
                    } else {
                        logger.warn(`Souvenir tokenId ${souvenirId} not found in DB, linking will be deferred or skipped`);
                    }
                }

                await prisma.travel.update({
                    where: { id: activeTravel.id },
                    data: {
                        status: 'Completed',
                        journalHash: journalHash as string,
                        souvenirId: dbSouvenirId,
                        completedAt: new Date(Number(timestamp) * 1000),
                    },
                });

                // 更新勋章系统统计
                const chainKeyMap: Record<number, ChainKey> = {
                    97: 'BSC_TESTNET',
                    11155111: 'ETH_SEPOLIA',
                    7001: 'ZETACHAIN_ATHENS',
                };
                const chainKey = chainKeyMap[activeTravel.chainId];
                if (chainKey) {
                    await travelP0Service.updateFrogStats(
                        activeTravel.id,
                        chainKey,
                        [], // 链上旅行暂时没有 discoveries，除非后面集成观测
                        BigInt(0),
                        new Date(Number(timestamp) * 1000)
                    );
                }
            }

            logger.info(`Travel completed for frog ${tokenId}`);

        } catch (error) {
            logger.error(`Error handling TravelCompleted event:`, error);
        }
    }

    private async handleTravelCancelled(log: any) {
        const { tokenId, timestamp } = log.args;
        logger.info(`TravelCancelled: tokenId=${tokenId}`);

        try {
            const frog = await prisma.frog.findUnique({
                where: { tokenId: Number(tokenId) },
            });

            if (!frog) return;

            // 更新青蛙状态
            await prisma.frog.update({
                where: { id: frog.id },
                data: { status: FrogStatus.Idle },
            });

            // 更新旅行记录
            const activeTravel = await prisma.travel.findFirst({
                where: {
                    frogId: frog.id,
                    status: 'Active',
                },
                orderBy: { startTime: 'desc' },
            });

            if (activeTravel) {
                await prisma.travel.update({
                    where: { id: activeTravel.id },
                    data: {
                        status: 'Cancelled',
                        completedAt: new Date(Number(timestamp) * 1000),
                    },
                });
            }

            logger.info(`Travel cancelled for frog ${tokenId}`);

        } catch (error) {
            logger.error(`Error handling TravelCancelled event:`, error);
        }
    }

    private async handleLevelUp(log: any) {
        const { tokenId, newLevel, timestamp } = log.args;
        logger.info(`LevelUp: tokenId=${tokenId}, newLevel=${newLevel}`);

        try {
            const frog = await prisma.frog.findUnique({
                where: { tokenId: Number(tokenId) },
            });

            if (!frog) return;

            await prisma.frog.update({
                where: { id: frog.id },
                data: { level: Number(newLevel) },
            });

            logger.info(`Frog ${tokenId} leveled up to ${newLevel}`);

        } catch (error) {
            logger.error(`Error handling LevelUp event:`, error);
        }
    }

    private async handleSouvenirMinted(log: any) {
        const { souvenirId, frogId, owner, rarity, name } = log.args;
        logger.info(`SouvenirMinted: souvenirId=${souvenirId}, frogId=${frogId}, owner=${owner}`);

        try {
            const frog = await prisma.frog.findUnique({
                where: { tokenId: Number(frogId) },
            });

            if (!frog) return;

            const rarityMap = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
            const rarityStr = rarityMap[Number(rarity)] || 'Common';

            await prisma.souvenir.upsert({
                where: { 
                    tokenId_chainType: {
                        tokenId: Number(souvenirId),
                        chainType: 'ZETACHAIN_ATHENS'
                    }
                },
                update: {
                    name: name as string,
                    rarity: rarityStr as any,
                    frogId: frog.id,
                },
                create: {
                    tokenId: Number(souvenirId),
                    frogId: frog.id,
                    name: name as string,
                    rarity: rarityStr as any,
                    chainType: 'ZETACHAIN_ATHENS',
                    mintedAt: new Date(),
                },
            });

            // 尝试在后续更新关联的旅行记录（如果有的话）
            const unlinkedTravel = await prisma.travel.findFirst({
                where: {
                    frogId: frog.id,
                    status: 'Completed',
                    souvenirId: null
                },
                orderBy: { completedAt: 'desc' }
            });

            if (unlinkedTravel) {
                const dbSouvenir = await prisma.souvenir.findFirst({
                    where: { tokenId: Number(souvenirId) }
                });
                if (dbSouvenir) {
                    await prisma.travel.update({
                        where: { id: unlinkedTravel.id },
                        data: { souvenirId: dbSouvenir.id }
                    });
                    logger.info(`Linked souvenir ${souvenirId} to travel ${unlinkedTravel.id} after delayed mint event`);
                }
            }

        } catch (error) {
            logger.error(`Error handling SouvenirMinted event:`, error);
        }
    }

    /**
     * 手动同步单个青蛙数据
     */
    async syncFrog(tokenId: number) {
        try {
            // 合约返回 6 个字段: [name, birthday, totalTravels, status, xp, level]
            const onChainData = await this.publicClient.readContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'getFrog',
                args: [BigInt(tokenId)],
            }) as [string, bigint, number, number, bigint, bigint];

            const owner = await this.publicClient.readContract({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'ownerOf',
                args: [BigInt(tokenId)],
            }) as string;

            if (onChainData && onChainData[0]) {
                const statusMap = ['Idle', 'Traveling', 'Returning'] as const;

                // 预先查询本地数据以合并统计
                const frog = await prisma.frog.findUnique({ where: { tokenId } });

                await prisma.frog.upsert({
                    where: { tokenId },
                    update: {
                        name: onChainData[0],
                        ownerAddress: (owner as string).toLowerCase(),
                        totalTravels: Number(onChainData[2]) + (frog?.p0Travels || 0),
                        status: statusMap[Number(onChainData[3])] as FrogStatus,
                        xp: Number(onChainData[4]),
                        level: Number(onChainData[5]),
                    },
                    create: {
                        tokenId,
                        name: onChainData[0],
                        ownerAddress: (owner as string).toLowerCase(),
                        birthday: new Date(Number(onChainData[1]) * 1000),
                        totalTravels: Number(onChainData[2]),
                        status: statusMap[Number(onChainData[3])] as FrogStatus,
                        xp: Number(onChainData[4]),
                        level: Number(onChainData[5]),
                    }
                });

                logger.info(`Manually synced frog ${tokenId}`);
                
                // [Self-Healing] Check and restore active travel if needed
                await this.checkActiveTravelOnChain(tokenId);

                return true;
            }
            return false;

        } catch (error: any) {
            // Check for NonexistentToken error (or ownerOf revert)
            const isNonexistent = error?.message?.includes('ownerOf') || 
                                  error?.shortMessage?.includes('ownerOf') ||
                                  error?.details?.includes('0x7e273289') || // ERC721NonexistentToken
                                  error?.shortMessage?.includes('0x7e273289');

            if (isNonexistent) {
                logger.warn(`Sync skipped: Frog ${tokenId} does not exist on chain.`);
            } else {
                logger.error(`Error syncing frog ${tokenId}:`, error);
            }
            return false;
        }
    }

    /**
     * [Self-Healing] Check and restore active travel from chain
     */
    async checkActiveTravelOnChain(tokenId: number) {
        try {
            // Read active travel from Travel contract
            const result = await this.publicClient.readContract({
                address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'getActiveTravel',
                args: [BigInt(tokenId)],
            }) as [bigint, bigint, string, bigint, boolean];

            const [startTime, endTime, targetWallet, targetChainId, completed] = result;

            // Check validity: startTime > 0 and not completed
            if (completed || Number(startTime) === 0) {
                return; // No active travel
            }

            const frog = await prisma.frog.findUnique({ where: { tokenId } });
            if (!frog) return;

            // Check if DB record exists
            const existingTravel = await prisma.travel.findFirst({
                where: {
                    frogId: frog.id,
                    startTime: new Date(Number(startTime) * 1000),
                }
            });

            if (!existingTravel) {
                logger.warn(`[Self-Healing] Missing active travel for frog ${tokenId}. Restoring...`);
                
                const isRandom = (targetWallet as string).toLowerCase() === '0x0000000000000000000000000000000000000000';
                
                const newTravel = await prisma.travel.create({
                    data: {
                        frogId: frog.id,
                        targetWallet: (targetWallet as string).toLowerCase(),
                        chainId: Number(targetChainId),
                        startTime: new Date(Number(startTime) * 1000),
                        endTime: new Date(Number(endTime) * 1000),
                        status: 'Active',
                        isRandom: isRandom,
                        observedTxCount: 0,
                        observedTotalValue: "0",
                    },
                });

                // Ensure frog status is Traveling
                await prisma.frog.update({
                    where: { id: frog.id },
                    data: { status: FrogStatus.Traveling }
                });

                logger.info(`[Self-Healing] Restored travel ${newTravel.id} for frog ${tokenId}`);

                // Notify frontend
                try {
                    const { notifyTravelStarted } = await import('../websocket');
                    notifyTravelStarted(frog.tokenId, {
                        travelId: newTravel.id,
                        targetWallet: newTravel.targetWallet,
                        startTime: newTravel.startTime,
                        endTime: newTravel.endTime,
                        status: 'Active',
                        chainId: newTravel.chainId
                    });
                } catch (e) {
                    logger.warn('Failed to send websocket update during self-healing');
                }
            } else if (existingTravel.status !== 'Active' && existingTravel.status !== 'Processing') {
                // Recover from stuck "Failed" state if chain says Active
                if (existingTravel.status === 'Failed') {
                    logger.info(`[Self-Healing] Reactivating Failed travel ${existingTravel.id} as it is active on-chain`);
                    await prisma.travel.update({
                        where: { id: existingTravel.id },
                        data: { status: 'Active' }
                    });
                }
            }

        } catch (error) {
            // logger.error(`[Self-Healing] Error checking travel for frog ${tokenId}:`, error);
        }
    }

    /**
     * [Self-Healing] Periodically scan all frogs
     */
    async runHealthCheck() {
        logger.info('[Self-Healing] Starting health check scan...');
        try {
            const frogs = await prisma.frog.findMany({ select: { tokenId: true } });
            
            for (const f of frogs) {
                await this.checkActiveTravelOnChain(f.tokenId);
            }
            logger.info(`[Self-Healing] Completed health check for ${frogs.length} frogs`);
        } catch (error) {
            logger.error('[Self-Healing] Health check failed:', error);
        }
    }

    /**
     * 同步单个青蛙的活跃旅行数据
     */
    async syncActiveTravel(tokenId: number) {
        try {
            const frog = await prisma.frog.findUnique({
                where: { tokenId },
            });

            if (!frog) {
                logger.error(`Frog ${tokenId} not found in database`);
                return false;
            }

            // 合约返回: [startTime, endTime, targetWallet, targetChainId, completed]
            const travelData = await this.publicClient.readContract({
                address: config.TRAVEL_CONTRACT_ADDRESS as `0x${string}`,
                abi: ZETAFROG_ABI,
                functionName: 'getActiveTravel',
                args: [BigInt(tokenId)],
            }) as [bigint, bigint, string, bigint, boolean];

            const startTime = Number(travelData[0]);
            const endTime = Number(travelData[1]);
            const targetWallet = travelData[2];
            const targetChainId = Number(travelData[3]);
            const completed = travelData[4];

            // 如果没有活跃旅行 (startTime 为 0)
            if (startTime === 0) {
                logger.info(`No active travel for frog ${tokenId}`);
                return true;
            }

            // 检查数据库是否已有该旅行
            const existingTravel = await prisma.travel.findFirst({
                where: {
                    frogId: frog.id,
                    startTime: new Date(startTime * 1000),
                },
            });

            if (!existingTravel) {
                // 创建旅行记录
                await prisma.travel.create({
                    data: {
                        frogId: frog.id,
                        targetWallet: targetWallet.toLowerCase(),
                        startTime: new Date(startTime * 1000),
                        endTime: new Date(endTime * 1000),
                        chainId: targetChainId,
                        status: completed ? 'Completed' : 'Active',
                        completedAt: completed ? new Date() : null,
                    },
                });
                logger.info(`Created travel record for frog ${tokenId}`);
            } else {
                // 更新现有记录
                await prisma.travel.update({
                    where: { id: existingTravel.id },
                    data: {
                        status: completed ? 'Completed' : existingTravel.status,
                    },
                });
            }

            return true;

        } catch (error) {
            logger.error(`Error syncing active travel for frog ${tokenId}:`, error);
            return false;
        }
    }
}

export const eventListener = new EventListener();