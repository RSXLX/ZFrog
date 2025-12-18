// backend/src/workers/eventListener.ts

import { createPublicClient, http, parseAbiItem } from 'viem';
import { defineChain } from 'viem';
import { PrismaClient, FrogStatus } from '@prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ZETAFROG_ABI } from '../config/contracts';

const prisma = new PrismaClient();

const zetachainAthens = defineChain({
    id: 7001,
    name: 'ZetaChain Athens Testnet',
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

        // 定期扫描（防止遗漏）
        setInterval(() => this.scanHistoricalEvents(), 60 * 1000);

        logger.info('Event listener started successfully');
    }

    private async scanHistoricalEvents() {
        try {
            const currentBlock = await this.publicClient.getBlockNumber();
            const fromBlock = this.lastProcessedBlock + BigInt(1);

            if (fromBlock > currentBlock) {
                return;
            }

            logger.info(`Scanning blocks ${fromBlock} to ${currentBlock}`);

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

            // 监听 TravelStarted 事件 - 修正事件签名，包含 targetChainId
            const travelLogs = await this.publicClient.getLogs({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                event: parseAbiItem('event TravelStarted(uint256 indexed tokenId, address indexed targetWallet, uint256 targetChainId, uint64 startTime, uint64 endTime)'),
                fromBlock,
                toBlock: currentBlock,
            });

            for (const log of travelLogs) {
                await this.handleTravelStarted(log);
            }

            // 监听 TravelCompleted 事件
            const completedLogs = await this.publicClient.getLogs({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
                event: parseAbiItem('event TravelCompleted(uint256 indexed tokenId, string journalHash, uint256 souvenirId, uint256 timestamp)'),
                fromBlock,
                toBlock: currentBlock,
            });

            for (const log of completedLogs) {
                await this.handleTravelCompleted(log);
            }

            // 监听 TravelCancelled 事件
            const cancelledLogs = await this.publicClient.getLogs({
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
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

        // 监听 TravelStarted - 修正事件签名
        this.publicClient.watchEvent({
            address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event TravelStarted(uint256 indexed tokenId, address indexed targetWallet, uint256 targetChainId, uint64 startTime, uint64 endTime)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleTravelStarted(log);
                }
            },
        });

        // 监听 TravelCompleted
        this.publicClient.watchEvent({
            address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
            event: parseAbiItem('event TravelCompleted(uint256 indexed tokenId, string journalHash, uint256 souvenirId, uint256 timestamp)'),
            onLogs: async (logs: any) => {
                for (const log of logs) {
                    await this.handleTravelCompleted(log);
                }
            },
        });

        // 监听 TravelCancelled
        this.publicClient.watchEvent({
            address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
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

        logger.info('Watching for new events...');
    }

    private async handleFrogMinted(log: any) {
        const { owner, tokenId, name, timestamp } = log.args;
        logger.info(`FrogMinted: tokenId=${tokenId}, owner=${owner}, name=${name}`);

        try {
            // 检查是否已存在
            const existing = await prisma.frog.findUnique({
                where: { tokenId: Number(tokenId) },
            });

            if (existing) {
                logger.info(`Frog ${tokenId} already exists in database`);
                return;
            }

            // 创建青蛙记录
            await prisma.frog.create({
                data: {
                    tokenId: Number(tokenId),
                    name: name as string,
                    ownerAddress: (owner as string).toLowerCase(),
                    birthday: new Date(Number(timestamp) * 1000),
                    totalTravels: 0,
                    status: FrogStatus.Idle,
                    xp: 0,
                    level: 1,
                },
            });

            logger.info(`Frog ${tokenId} saved to database`);

        } catch (error) {
            logger.error(`Error handling FrogMinted event:`, error);
        }
    }

    private async handleTravelStarted(log: any) {
        // 修正：正确解析包含 targetChainId 的事件
        const { tokenId, targetWallet, targetChainId, startTime, endTime } = log.args;
        logger.info(`TravelStarted: tokenId=${tokenId}, target=${targetWallet}, chainId=${targetChainId}`);

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

            // 检查是否已有相同的旅行记录
            const existingTravel = await prisma.travel.findFirst({
                where: {
                    frogId: frog.id,
                    startTime: new Date(Number(startTime) * 1000),
                    status: 'Active',
                },
            });

            if (existingTravel) {
                logger.info(`Travel already exists for frog ${tokenId}`);
                return;
            }

            // 更新青蛙状态
            await prisma.frog.update({
                where: { id: frog.id },
                data: { status: FrogStatus.Traveling },
            });

            // 创建旅行记录
            await prisma.travel.create({
                data: {
                    frogId: frog.id,
                    targetWallet: (targetWallet as string).toLowerCase(),
                    startTime: new Date(Number(startTime) * 1000),
                    endTime: new Date(Number(endTime) * 1000),
                    status: 'Active',
                    chainId: Number(targetChainId),
                },
            });

            logger.info(`Travel started for frog ${tokenId} to chain ${targetChainId}`);

        } catch (error) {
            logger.error(`Error handling TravelStarted event:`, error);
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

            // 更新青蛙状态
            await prisma.frog.update({
                where: { id: frog.id },
                data: {
                    status: FrogStatus.Idle,
                    totalTravels: { increment: 1 },
                },
            });

            // 更新最近的活跃旅行记录
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
                        status: 'Completed',
                        journalHash: journalHash as string,
                        completedAt: new Date(Number(timestamp) * 1000),
                    },
                });
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

                await prisma.frog.upsert({
                    where: { tokenId },
                    update: {
                        name: onChainData[0],
                        ownerAddress: (owner as string).toLowerCase(),
                        totalTravels: Number(onChainData[2]),
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
                return true;
            }
            return false;

        } catch (error) {
            logger.error(`Error syncing frog ${tokenId}:`, error);
            return false;
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
                address: config.ZETAFROG_NFT_ADDRESS as `0x${string}`,
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