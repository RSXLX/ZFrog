/**
 * Exploration Scheduler Service
 * 
 * Handles scheduled random explorations for cross-chain traveling frogs
 * - Triggers exploration at regular intervals (based on travel duration)
 * - Generates AI observations using prompts
 * - Updates active address pool from chain data
 * - Monitors provisions and triggers return when exhausted
 */

import { ethers } from 'ethers';
import { addSafeErrorHandler } from '../utils/provider';
import { prisma } from '../database';
import { config } from '../config';
import { logger } from '../utils/logger';
import { PromptBuilderService } from './prompt-builder.service';
import { getRandomObservation } from '../config/prompt-templates';
import { blockExplorerService, generateExplorationDescription } from './block-explorer.service';
import { getRandomInterestingAddress, getDiscoveryDescription, InterestingAddress } from '../config/interesting-addresses';
import {
    notifyCrossChainDiscovery,
    notifyCrossChainStatus
} from '../websocket';
import { CrossChainStatus } from '@prisma/client';

// Contract ABIs (minimal)
const FROG_CONNECTOR_ABI = [
    'function randomExplore(uint256 tokenId, string calldata observation) external',
    'function shouldReturn(uint256 tokenId) external view returns (bool, string memory)',
    'function updateActiveAddressPool(address[] calldata addresses) external',
    'function getActivePoolSize() external view returns (uint256)',
    'function frogProvisions(uint256) external view returns (uint256)',
    'function visitingFrogs(uint256) external view returns (address owner, string name, uint64 arrivalTime, uint8 status, uint256 actionsExecuted, uint256 xpEarned)',
    'function autoReturnFrog(uint256 tokenId) external',
    'event RandomExploration(uint256 indexed tokenId, address indexed exploredAddress, bool isContract, uint256 codeSize, string observation, uint256 timestamp)'
];

// OmniTravel ABI for Gateway-based exploration (only ZETA gas needed)
const OMNI_TRAVEL_ABI = [
    'function triggerExploration(uint256 tokenId, string calldata observation, uint256 minReserve) external',
    'function crossChainTravels(uint256) external view returns (uint256 tokenId, address owner, uint256 targetChainId, bytes32 outboundMessageId, bytes32 returnMessageId, uint64 startTime, uint64 maxDuration, uint8 status, bytes travelData)',
    'event ExplorationTriggered(uint256 indexed tokenId, uint256 targetChainId, string observation, uint256 timestamp)',
    'event ExplorationCompleted(uint256 indexed tokenId, address exploredAddress, bool isContract, string observation, uint256 timestamp)'
];

interface ExploringFrog {
    tokenId: number;
    travelId: number;
    targetChainId: number;
    startTime: Date;
    duration: number;
    lastExplorationTime: Date | null;
    explorationCount: number;
}

export class ExplorationSchedulerService {
    private isRunning = false;
    private checkInterval: NodeJS.Timeout | null = null;
    private promptBuilder: PromptBuilderService;
    
    // Chain configurations
    private chainConfigs: Map<number, {
        rpcUrl: string;
        connectorAddress: string;
        explorerApi: string;
    }> = new Map();
    
    // Tracking exploring frogs (added by CrossChainListener)
    private exploringFrogsMap: Map<number, ExploringFrog> = new Map();
    
    // Local address pool cache per chain (updated by updateChainAddressPool)
    private localAddressPools: Map<number, string[]> = new Map();
    
    // Local frog pool: cached list of registered user wallets for visiting
    private localFrogPool: { address: string; name: string }[] = [];
    
    // Gateway-based exploration: ZetaChain connection
    private zetaProvider: ethers.JsonRpcProvider | null = null;
    private zetaWallet: ethers.Wallet | null = null;
    private omniTravelContract: ethers.Contract | null = null;
    private useGatewayMode = true; // Use Gateway for exploration (no target chain gas needed)
    
    // P0 Feature: Track explored addresses per travel to prevent duplicates
    private exploredAddressesCache: Map<number, Set<string>> = new Map();

    constructor() {
        this.promptBuilder = new PromptBuilderService();
        
        // Initialize ZetaChain connection for Gateway-based exploration
        if (config.ZETACHAIN_RPC_URL && config.PRIVATE_KEY && config.OMNI_TRAVEL_ADDRESS) {
            try {
                this.zetaProvider = new ethers.JsonRpcProvider(config.ZETACHAIN_RPC_URL);
                addSafeErrorHandler(this.zetaProvider, 'ZetaChain');
                this.zetaWallet = new ethers.Wallet(config.PRIVATE_KEY, this.zetaProvider);
                this.omniTravelContract = new ethers.Contract(
                    config.OMNI_TRAVEL_ADDRESS,
                    OMNI_TRAVEL_ABI,
                    this.zetaWallet
                );
                logger.info('[ExplorationScheduler] Gateway mode enabled - using ZetaChain for exploration');
            } catch (err) {
                logger.error('[ExplorationScheduler] Failed to init ZetaChain connection:', err);
                this.useGatewayMode = false;
            }
        } else {
            logger.warn('[ExplorationScheduler] ZetaChain config missing, falling back to direct chain calls');
            this.useGatewayMode = false;
        }
        
        // Initialize target chain configs (fallback mode)
        this.chainConfigs.set(97, { // BSC Testnet
            rpcUrl: config.BSC_TESTNET_RPC_URL || '',
            connectorAddress: config.BSC_CONNECTOR_ADDRESS || '',
            explorerApi: 'https://api-testnet.bscscan.com/api'
        });
        
        this.chainConfigs.set(11155111, { // ETH Sepolia
            rpcUrl: config.ETH_SEPOLIA_RPC_URL || '',
            connectorAddress: config.SEPOLIA_CONNECTOR_ADDRESS || '',
            explorerApi: 'https://api-sepolia.etherscan.io/api'
        });
    }

    /**
     * Start the exploration scheduler
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('[ExplorationScheduler] Already running');
            return;
        }
        
        this.isRunning = true;
        logger.info('[ExplorationScheduler] Starting exploration scheduler...');
        
        // Run check every 90 seconds for active explorations
        this.checkInterval = setInterval(() => {
            this.checkAndTriggerExplorations().catch(err => {
                logger.error('[ExplorationScheduler] Error in check cycle:', err);
            });
        }, 90 * 1000); // Every 90 seconds
        
        // Initial address pool update (local cache only, no gas)
        await this.updateAddressPools();
        
        // Update local frog pool (registered users' wallets)
        await this.updateLocalFrogPool();
        
        // Initial exploration check
        await this.checkAndTriggerExplorations();
        
        logger.info('[ExplorationScheduler] Scheduler initialized (background polling enabled)');
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        logger.info('[ExplorationScheduler] Stopped');
    }

    /**
     * Add a frog to the exploring list (called by CrossChainListener on FrogArrived)
     */
    async addExploringFrog(frog: Omit<ExploringFrog, 'lastExplorationTime' | 'explorationCount'>): Promise<void> {
        const exploringFrog: ExploringFrog = {
            ...frog,
            lastExplorationTime: null,
            explorationCount: 0
        };
        this.exploringFrogsMap.set(frog.tokenId, exploringFrog);
        logger.info(`[ExplorationScheduler] Added exploring frog ${frog.tokenId} on chain ${frog.targetChainId}`);
    }

    /**
     * Remove a frog from the exploring list (called on FrogReturned)
     */
    removeExploringFrog(tokenId: number): void {
        if (this.exploringFrogsMap.has(tokenId)) {
            this.exploringFrogsMap.delete(tokenId);
            logger.info(`[ExplorationScheduler] Removed exploring frog ${tokenId}`);
        }
    }

    /**
     * Start exploration for a specific travel (called by CrossChainListener)
     */
    async startForTravel(travelId: number): Promise<void> {
        const travel = await prisma.travel.findUnique({
            where: { id: travelId },
            include: { frog: true }
        });
        
        if (travel && travel.frog) {
            await this.addExploringFrog({
                tokenId: travel.frog.tokenId,
                travelId: travel.id,
                targetChainId: travel.chainId,
                duration: travel.duration,
                startTime: travel.startTime
            });
        }
    }

    /**
     * Stop exploration for a frog (alias for removeExploringFrog)
     */
    stopForFrog(tokenId: number): void {
        this.removeExploringFrog(tokenId);
    }

    /**
     * Check all active cross-chain travels and trigger explorations if needed
     */
    private async checkAndTriggerExplorations(): Promise<void> {
        // 回退时间: 2 分钟后自动升级 CROSSING_OUT 为 ON_TARGET_CHAIN
        const fallbackTime = new Date(Date.now() - 2 * 60 * 1000);
        
        // Find all active cross-chain travels, including CROSSING_OUT fallback
        const activeTravels = await prisma.travel.findMany({
            where: {
                isCrossChain: true,
                status: 'Active',
                OR: [
                    // 正常: 已抵达目标链或锁定
                    { crossChainStatus: { in: [CrossChainStatus.ON_TARGET_CHAIN, CrossChainStatus.LOCKED] } },
                    // 回退: CROSSING_OUT 超过 2 分钟，视为已抵达
                    {
                        crossChainStatus: CrossChainStatus.CROSSING_OUT,
                        startTime: { lt: fallbackTime }
                    }
                ]
            },
            include: {
                frog: true
            }
        });

        logger.info(`[ExplorationScheduler] Found ${activeTravels.length} active cross-chain travels`);

        for (const travel of activeTravels) {
            try {
                // 回退逻辑: 如果状态是 CROSSING_OUT，自动升级为 ON_TARGET_CHAIN
                if (travel.crossChainStatus === CrossChainStatus.CROSSING_OUT) {
                    logger.info(`[ExplorationScheduler] Auto-upgrading travel ${travel.id} from CROSSING_OUT to ON_TARGET_CHAIN (2min fallback)`);
                    await prisma.travel.update({
                        where: { id: travel.id },
                        data: { 
                            crossChainStatus: CrossChainStatus.ON_TARGET_CHAIN,
                            targetChainArrivalTime: new Date(),
                            currentStage: 'EXPLORING',
                            progress: 30
                        }
                    });
                }
                
                await this.processExploringFrog({
                    tokenId: travel.frog?.tokenId || 0,
                    travelId: travel.id,
                    targetChainId: travel.chainId,
                    startTime: travel.startTime,
                    duration: Math.floor((travel.endTime.getTime() - travel.startTime.getTime()) / 1000),
                    lastExplorationTime: travel.targetChainArrivalTime || travel.startTime,
                    explorationCount: Array.isArray(travel.targetChainActions) ? travel.targetChainActions.length : 0
                });
            } catch (err) {
                logger.error(`[ExplorationScheduler] Error processing frog ${travel.frog?.tokenId}:`, err);
            }
        }
        
        // V2.0: Process cross-chain group travels
        await this.processGroupTravels();
    }
    
    /**
     * V2.0: Process cross-chain group travels (both frogs share discoveries)
     */
    private async processGroupTravels(): Promise<void> {
        try {
            // Find active cross-chain group travels
            const groupTravels = await prisma.groupTravel.findMany({
                where: {
                    status: 'ACTIVE'
                },
                include: {
                    travel: true,
                    leader: true,
                    companion: true
                }
            });
            
            if (groupTravels.length === 0) return;
            
            logger.info(`[ExplorationScheduler] Found ${groupTravels.length} active group travels`);
            
            for (const groupTravel of groupTravels) {
                try {
                    await this.processGroupTravelExploration(groupTravel);
                } catch (err) {
                    logger.error(`[ExplorationScheduler] Error processing group travel ${groupTravel.id}:`, err);
                }
            }
        } catch (err) {
            logger.error('[ExplorationScheduler] Error in processGroupTravels:', err);
        }
    }
    
    /**
     * V2.0: Process a single group travel - generate shared discoveries for both frogs
     */
    private async processGroupTravelExploration(groupTravel: any): Promise<void> {
        const { travel, leader, companion } = groupTravel;
        if (!travel || !leader || !companion) return;
        
        // Check interval - use testing mode interval
        const TESTING_MODE = true;
        const intervalMinutes = TESTING_MODE ? 1 : 5;
        
        const now = new Date();
        const lastExplore = travel.targetChainArrivalTime || travel.startTime;
        const timeSinceLastExplore = (now.getTime() - new Date(lastExplore).getTime()) / 1000 / 60;
        
        if (timeSinceLastExplore < intervalMinutes) {
            return; // Not yet time
        }
        
        logger.info(`[ExplorationScheduler] Triggering group exploration for leader=${leader.tokenId}, companion=${companion.tokenId}`);
        
        // Get chain config
        const chainId = groupTravel.targetChainId || travel.chainId;
        const chainConfig = this.chainConfigs.get(chainId);
        if (!chainConfig) {
            logger.warn(`[ExplorationScheduler] No config for chain ${chainId}`);
            return;
        }
        
        // Get explored addresses to avoid duplicates
        const exploredSet = await this.getExploredAddressesForTravel(travel.id);
        
        // Pick a random address
        const targetResult = this.getRandomTargetAddress(chainId, exploredSet);
        const targetAddress = targetResult.address;
        const interestingInfo = targetResult.interesting;
        
        // Generate shared observation
        const observation = `${leader.name} 和 ${companion.name} 一起探索了 ${interestingInfo?.name || targetAddress.slice(0, 10)}...`;
        
        // Create discovery for BOTH frogs
        const blockNumber = this.zetaProvider ? await this.zetaProvider.getBlockNumber() : 0;
        
        // Create interaction record for leader
        await prisma.travelInteraction.create({
            data: {
                travelId: travel.id,
                chainId: chainId,
                blockNumber: BigInt(blockNumber),
                message: `[结伴] ${observation}`,
                exploredAddress: targetAddress,
                isContract: interestingInfo?.category === 'defi' || interestingInfo?.category === 'bridge'
            }
        });
        
        // Update travel actions
        await prisma.travel.update({
            where: { id: travel.id },
            data: {
                targetChainActions: {
                    push: {
                        type: 'group_exploration',
                        targetAddress: targetAddress,
                        interestingName: interestingInfo?.name || null,
                        observation,
                        participants: [leader.tokenId, companion.tokenId],
                        timestamp: new Date().toISOString()
                    }
                },
                targetChainArrivalTime: new Date()
            }
        });
        
        // Add to explored cache
        exploredSet.add(targetAddress.toLowerCase());
        
        // Notify both frogs via WebSocket
        const discoveryPayload = {
            type: (interestingInfo ? 'landmark' : 'encounter') as 'landmark' | 'encounter',
            title: `🐸🐸 ${interestingInfo?.name || '发现钱包'}`,
            description: observation,
            location: `${targetAddress.slice(0, 10)}... (Chain ${chainId})`,
            rarity: (interestingInfo?.rarity || 2) + 1, // Group bonus
            metadata: { isGroupTravel: true }
        };
        
        notifyCrossChainDiscovery(leader.tokenId, discoveryPayload);
        notifyCrossChainDiscovery(companion.tokenId, discoveryPayload);
        
        logger.info(`[ExplorationScheduler] Group exploration completed: ${targetAddress}`);
    }

    /**
     * Process a single exploring frog
     */
    private async processExploringFrog(frog: ExploringFrog): Promise<void> {
        const chainConfig = this.chainConfigs.get(frog.targetChainId);
        if (!chainConfig || !chainConfig.rpcUrl) {
            logger.warn(`[ExplorationScheduler] No config for chain ${frog.targetChainId}`);
            return;
        }

        const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
        const wallet = new ethers.Wallet(config.PRIVATE_KEY || '', provider);
        const connector = new ethers.Contract(
            chainConfig.connectorAddress,
            FROG_CONNECTOR_ABI,
            wallet
        );

        // Check if frog should return
        const [shouldReturn, reason] = await connector.shouldReturn(frog.tokenId);
        
        if (shouldReturn) {
            logger.info(`[ExplorationScheduler] Frog ${frog.tokenId} should return: ${reason}`);
            await this.triggerReturn(frog);
            return;
        }

        // Calculate exploration interval based on duration and chain activity
        // Base intervals by duration:
        // 1 hour = 5 min interval (12 explorations)
        // 6 hours = 15 min interval (24 explorations)
        // 24 hours = 30 min interval (48 explorations)
        // [TEST MODE] 固定 1 分钟间隔用于测试
        const TESTING_MODE = true;
        let baseIntervalMinutes: number;
        
        if (TESTING_MODE) {
            baseIntervalMinutes = 1; // 测试模式: 每分钟探索一次
        } else if (frog.duration <= 3600) {
            baseIntervalMinutes = 5;
        } else if (frog.duration <= 21600) {
            baseIntervalMinutes = 15;
        } else {
            baseIntervalMinutes = 30;
        }
        
        // Apply chain activity factor (dynamic adjustment) - skip in testing mode
        const chainActivityFactor = TESTING_MODE ? 1 : await this.getChainActivityFactor(frog.targetChainId);
        const intervalMinutes = Math.floor(baseIntervalMinutes * chainActivityFactor);
        
        logger.debug(`[ExplorationScheduler] Chain ${frog.targetChainId} activity factor: ${chainActivityFactor}, interval: ${intervalMinutes}min${TESTING_MODE ? ' (TEST MODE)' : ''}`);

        // Check if it's time to explore
        const now = new Date();
        const lastExplore = frog.lastExplorationTime || frog.startTime;
        const timeSinceLastExplore = (now.getTime() - lastExplore.getTime()) / 1000 / 60;

        if (timeSinceLastExplore < intervalMinutes) {
            return; // Not yet time
        }

        logger.info(`[ExplorationScheduler] Triggering exploration for frog ${frog.tokenId}`);

        // Generate observation using AI
        const observation = await this.generateObservation(frog);

        // Trigger exploration via Gateway (only ZETA gas needed) or fallback to direct call
        try {
            if (this.useGatewayMode && this.omniTravelContract) {
                // Gateway-based exploration - only uses ZETA gas on ZetaChain
                logger.info(`[ExplorationScheduler] Using Gateway mode for frog ${frog.tokenId}`);
                
                // P0: Load already explored addresses to prevent duplicates
                const exploredSet = await this.getExploredAddressesForTravel(frog.travelId);
                logger.debug(`[ExplorationScheduler] Frog ${frog.tokenId} has explored ${exploredSet.size} addresses so far`);
                
                // Pick a random address (优先有趣地址, 排除已探索)
                const targetResult = this.getRandomTargetAddress(frog.targetChainId, exploredSet);
                const targetAddress = targetResult.address;
                const interestingInfo = targetResult.interesting;
                
                // Get real wallet data using Block Explorer API
                const explorerChainMap: Record<number, string> = {
                    97: 'BSC_TESTNET',
                    11155111: 'ETH_SEPOLIA',
                    7001: 'ZETACHAIN_ATHENS',
                };
                const explorerChain = explorerChainMap[frog.targetChainId];
                
                let walletDescription = getRandomObservation('empty_address');
                let isContract = false;
                let discoveryRarity = 2;
                
                // 如果是有趣地址，使用预设描述
                if (interestingInfo) {
                    walletDescription = getDiscoveryDescription(interestingInfo);
                    discoveryRarity = interestingInfo.rarity || 3;
                    isContract = interestingInfo.category === 'defi' || interestingInfo.category === 'bridge';
                    logger.info(`[ExplorationScheduler] Exploring interesting address: ${interestingInfo.name}`);
                } else if (explorerChain && targetAddress !== '0x0000000000000000000000000000000000000000') {
                    try {
                        const walletInfo = await blockExplorerService.getWalletInfo(explorerChain, targetAddress);
                        walletDescription = generateExplorationDescription(walletInfo);
                        isContract = walletInfo.isContract;
                        logger.info(`[ExplorationScheduler] Got wallet info for ${targetAddress}: ${walletDescription.substring(0, 50)}...`);
                    } catch (err) {
                        logger.warn(`[ExplorationScheduler] Failed to get wallet info, using random observation`);
                    }
                }
                
                // Generate observation with wallet data
                const frogData = await prisma.frog.findFirst({ where: { tokenId: frog.tokenId } });
                const observation = `${frogData?.name || '小呱'}: ${walletDescription}`;
                
                // Define safety reserve for return trip (0.05 ZETA)
                const SAFETY_RESERVE = ethers.parseEther("0.05");
                
                // Trigger exploration via Gateway (ZETA-Only mode)
                // Note: No backend wallet value needed, provisions are consumed from contract
                const tx = await this.omniTravelContract.triggerExploration(
                    frog.tokenId, 
                    observation,
                    SAFETY_RESERVE
                );
                const receipt = await tx.wait();
                
                // Check if exploration was skipped (Virtual Exploration)
                const exploredEvent = receipt.logs.find((log: any) => {
                    try {
                        const parsed = this.omniTravelContract?.interface.parseLog(log);
                        return parsed?.name === 'ExplorationTriggered';
                    } catch { return false; }
                });
                
                let isVirtual = false;
                if (exploredEvent) {
                    const parsed = this.omniTravelContract?.interface.parseLog(exploredEvent);
                    const obs = parsed?.args.observation;
                    if (obs && obs.startsWith('[VIRTUAL]')) {
                        isVirtual = true;
                        logger.info(`[ExplorationScheduler] Frog ${frog.tokenId} performed VIRTUAL exploration (low provisions)`);
                    }
                }
                
                logger.info(`[ExplorationScheduler] Gateway exploration triggered: tx=${receipt.hash}${isVirtual ? ' (VIRTUAL)' : ''}`);
                
                // Update database with exploration record
                // If virtual, mark it specifically in type or just log it
                await prisma.travel.update({
                    where: { id: frog.travelId },
                    data: {
                        targetChainActions: {
                            push: {
                                type: isVirtual ? 'virtual_exploration' : 'gateway_exploration',
                                targetAddress: targetAddress,
                                interestingName: interestingInfo?.name || null,
                                observation,
                                timestamp: new Date().toISOString(),
                                txHash: receipt.hash
                            }
                        }
                    }
                });
                
                // Save TravelInteraction record
                // For virtual exploration, we still record it but maybe with a flag?
                // For now, treat as normal interaction for UX consistency
                const blockNumber = await this.zetaProvider!.getBlockNumber();
                await prisma.travelInteraction.create({
                    data: {
                        travelId: frog.travelId,
                        chainId: frog.targetChainId, // Target chain, not ZetaChain
                        blockNumber: BigInt(blockNumber),
                        message: isVirtual ? `[云旅游] ${observation}` : observation,
                        exploredAddress: targetAddress, 
                        isContract: isContract,
                        txHash: receipt.hash
                    }
                });
                
                // Notify frontend via WebSocket
                notifyCrossChainDiscovery(frog.tokenId, {
                    type: interestingInfo ? 'landmark' : 'encounter',
                    title: isVirtual ? '云端漫游' : (interestingInfo ? `发现 ${interestingInfo.name}` : '发现钱包'),
                    description: isVirtual ? `由于干粮不足，青蛙只能远远地望着... ${observation}` : observation,
                    location: `${targetAddress.slice(0, 10)}... (Chain ${frog.targetChainId})`,
                    rarity: isVirtual ? 1 : discoveryRarity
                });
                
                // Notify travel:interaction
                const { notifyTravelInteraction } = await import('../websocket');
                notifyTravelInteraction(frog.tokenId, {
                    travelId: frog.travelId,
                    message: observation,
                    exploredAddress: targetAddress,
                    blockNumber: blockNumber.toString(),
                    timestamp: new Date().toISOString(),
                    isContract: isContract
                });
                
                logger.info(`[ExplorationScheduler] Frog ${frog.tokenId} explored ${targetAddress} via Gateway`);
                
                // P0: Add to explored cache to prevent duplicate exploration
                exploredSet.add(targetAddress.toLowerCase());
                
                
            } else {
                // Fallback: Direct call to target chain (requires target chain gas)
                logger.info(`[ExplorationScheduler] Using direct mode for frog ${frog.tokenId}`);
                
                const tx = await connector.randomExplore(frog.tokenId, observation);
                const receipt = await tx.wait();

                // Parse events to get exploration result
                const explorationEvent = receipt.logs.find((log: any) => {
                    try {
                        const parsed = connector.interface.parseLog(log);
                        return parsed?.name === 'RandomExploration';
                    } catch {
                        return false;
                    }
                });

                if (explorationEvent) {
                    const parsed = connector.interface.parseLog(explorationEvent);
                    const exploredAddress = parsed?.args.exploredAddress;
                    const isContract = parsed?.args.isContract;
                    const codeSize = parsed?.args.codeSize;

                    // Update database
                    await prisma.travel.update({
                        where: { id: frog.travelId },
                        data: {
                            targetChainActions: {
                                push: {
                                    type: isContract ? 'contract' : 'address',
                                    address: exploredAddress,
                                    observation,
                                    timestamp: new Date().toISOString()
                                }
                            },
                            targetChainArrivalTime: new Date()
                        }
                    });
                    
                    // 保存 TravelInteraction 记录
                    const blockNumber = await provider.getBlockNumber();
                    await prisma.travelInteraction.create({
                        data: {
                            travelId: frog.travelId,
                            chainId: frog.targetChainId,
                            blockNumber: BigInt(blockNumber),
                            message: observation,
                            exploredAddress: exploredAddress,
                            isContract: isContract,
                            txHash: receipt.hash
                        }
                    });

                    // Notify frontend via WebSocket
                    notifyCrossChainDiscovery(frog.tokenId, {
                        type: isContract ? 'landmark' : 'wisdom',
                        title: isContract ? '发现合约' : '路过地址',
                        description: observation,
                        location: exploredAddress,
                        rarity: isContract ? (codeSize > 10000 ? 3 : 2) : 1
                    });
                    
                    const { notifyTravelInteraction } = await import('../websocket');
                    notifyTravelInteraction(frog.tokenId, {
                        travelId: frog.travelId,
                        message: observation,
                        exploredAddress: exploredAddress,
                        blockNumber: blockNumber.toString(),
                        timestamp: new Date().toISOString(),
                        isContract
                    });

                    logger.info(`[ExplorationScheduler] Frog ${frog.tokenId} explored ${exploredAddress}`);
                }
            }
        } catch (err) {
            logger.error(`[ExplorationScheduler] Exploration failed for frog ${frog.tokenId}:`, err);
        }
    }

    /**
     * 获取随机目标地址
     * 策略（均等概率 25%）:
     * 1. 有趣地址（DeFi/NFT/巨鲸等）
     * 2. 本地青蛙池（系统内已注册用户钱包）
     * 3. 链上活跃地址（缓存池）
     * 4. 随机生成地址
     */
    private async getRandomTargetAddressAsync(
        chainId: number,
        excludeFrogOwner?: string
    ): Promise<{ address: string; interesting?: InterestingAddress; source: string }> {
        // Exclude backend wallet and current frog owner
        const backendWallet = (config.PRIVATE_KEY 
            ? new ethers.Wallet(config.PRIVATE_KEY).address.toLowerCase() 
            : '').toLowerCase();
        
        const excludeAddresses = [backendWallet];
        if (excludeFrogOwner) {
            excludeAddresses.push(excludeFrogOwner.toLowerCase());
        }
        
        // 均等概率选择策略
        const strategy = Math.floor(Math.random() * 4);
        
        // 策略 0: 有趣地址（25%）
        if (strategy === 0) {
            const interesting = getRandomInterestingAddress(chainId, excludeAddresses);
            if (interesting) {
                logger.info(`[ExplorationScheduler] Strategy: Interesting address - ${interesting.name}`);
                return { address: interesting.address, interesting, source: 'interesting' };
            }
        }
        
        // 策略 1: 本地青蛙池 - 系统内其他用户的钱包（25%）
        if (strategy === 1 || strategy === 0) {
            try {
                const localFrogs = await prisma.frog.findMany({
                    select: { ownerAddress: true, name: true },
                    where: {
                        ownerAddress: {
                            notIn: excludeAddresses
                        }
                    },
                    take: 50
                });
                
                if (localFrogs.length > 0) {
                    const randomFrog = localFrogs[Math.floor(Math.random() * localFrogs.length)];
                    logger.info(`[ExplorationScheduler] Strategy: Local frog pool - visiting ${randomFrog.name}'s home`);
                    return { 
                        address: randomFrog.ownerAddress, 
                        source: 'local_frog',
                        interesting: {
                            address: randomFrog.ownerAddress,
                            name: `${randomFrog.name}的家`,
                            category: 'other',
                            description: '系统内其他青蛙主人的钱包',
                            rarity: 3
                        } as InterestingAddress
                    };
                }
            } catch (err) {
                logger.warn('[ExplorationScheduler] Failed to fetch local frog pool:', err);
            }
        }
        
        // 策略 2: 链上活跃地址缓存池（25%）
        if (strategy === 2 || strategy === 1 || strategy === 0) {
            const pool = this.localAddressPools.get(chainId);
            if (pool && pool.length > 0) {
                const filteredPool = pool.filter(addr => 
                    !excludeAddresses.includes(addr.toLowerCase())
                );
                if (filteredPool.length > 0) {
                    const randomAddr = filteredPool[Math.floor(Math.random() * filteredPool.length)];
                    logger.info(`[ExplorationScheduler] Strategy: Chain address pool`);
                    return { address: randomAddr, source: 'chain_pool' };
                }
            }
        }
        
        // 策略 3: 随机生成（25%）或所有策略都失败时的 fallback
        const randomBytes = ethers.randomBytes(20);
        logger.info(`[ExplorationScheduler] Strategy: Random address generated`);
        return { address: ethers.hexlify(randomBytes), source: 'random' };
    }
    
    /**
     * 同步版本包装器（兼容现有代码）
     * @param chainId 目标链ID
     * @param excludeExplored 已探索的地址集合，防止重复扫描同一钱包
     */
    private getRandomTargetAddress(
        chainId: number, 
        excludeExplored: Set<string> = new Set()
    ): { address: string; interesting?: InterestingAddress } {
        // 由于 Prisma 需要异步，这里使用本地缓存的青蛙池
        const backendWallet = (config.PRIVATE_KEY 
            ? new ethers.Wallet(config.PRIVATE_KEY).address.toLowerCase() 
            : '').toLowerCase();
        
        // 合并排除列表：后端钱包 + 已探索地址
        const excludeAddresses = [backendWallet, ...Array.from(excludeExplored)];
        const strategy = Math.floor(Math.random() * 4);
        
        // 策略 0: 有趣地址
        if (strategy === 0) {
            const interesting = getRandomInterestingAddress(chainId, excludeAddresses);
            if (interesting) {
                return { address: interesting.address, interesting };
            }
        }
        
        // 策略 1: 本地青蛙池（使用缓存）
        if (strategy === 1 || strategy === 0) {
            const frogPool = this.localFrogPool;
            if (frogPool.length > 0) {
                const filtered = frogPool.filter(f => !excludeAddresses.includes(f.address.toLowerCase()));
                if (filtered.length > 0) {
                    const frog = filtered[Math.floor(Math.random() * filtered.length)];
                    return { 
                        address: frog.address, 
                        interesting: {
                            address: frog.address,
                            name: `${frog.name}的家`,
                            category: 'other',
                            rarity: 3
                        } as InterestingAddress
                    };
                }
            }
        }
        
        // 策略 2: 链上缓存池
        const pool = this.localAddressPools.get(chainId);
        if (pool && pool.length > 0) {
            const filtered = pool.filter(addr => !excludeAddresses.includes(addr.toLowerCase()));
            if (filtered.length > 0) {
                return { address: filtered[Math.floor(Math.random() * filtered.length)] };
            }
        }
        
        // 策略 3: 随机生成 (不受排除列表影响)
        return { address: ethers.hexlify(ethers.randomBytes(20)) };
    }
    
    /**
     * P0: 获取本次旅行已探索的地址集合
     */
    private async getExploredAddressesForTravel(travelId: number): Promise<Set<string>> {
        if (this.exploredAddressesCache.has(travelId)) {
            return this.exploredAddressesCache.get(travelId)!;
        }
        
        const interactions = await prisma.travelInteraction.findMany({
            where: { travelId },
            select: { exploredAddress: true }
        });
        
        const addresses = new Set(
            interactions
                .map(i => i.exploredAddress?.toLowerCase())
                .filter((a): a is string => Boolean(a))
        );
        
        this.exploredAddressesCache.set(travelId, addresses);
        logger.debug(`[ExplorationScheduler] Loaded ${addresses.size} explored addresses for travel ${travelId}`);
        return addresses;
    }
    
    /**
     * P0: 清理已探索地址缓存 (旅行结束时调用)
     */
    public clearExploredCache(travelId: number): void {
        this.exploredAddressesCache.delete(travelId);
        logger.debug(`[ExplorationScheduler] Cleared explored addresses cache for travel ${travelId}`);
    }

    /**
     * Generate an AI observation for the exploration
     */
    private async generateObservation(frog: ExploringFrog): Promise<string> {
        try {
            // Get frog info
            const frogData = await prisma.frog.findFirst({
                where: { tokenId: frog.tokenId }
            });

            // Use random observation templates instead of AI for now
            const types = ['contract_discovery', 'empty_address', 'random_events'] as const;
            const randomType = types[Math.floor(Math.random() * types.length)];
            const observation = getRandomObservation(randomType);
            
            return `${frogData?.name || '小呱'}: ${observation}`;
        } catch (err) {
            logger.error('[ExplorationScheduler] Observation generation failed:', err);
            return '青蛙在探索中发现了一些新奇的事物...';
        }
    }

    /**
     * Trigger frog return to ZetaChain
     */
    /**
     * Trigger frog return to ZetaChain
     */
    private async triggerReturn(frog: ExploringFrog): Promise<void> {
        try {
            const chainConfig = this.chainConfigs.get(frog.targetChainId);
            if (!chainConfig || !chainConfig.rpcUrl) return;

            // Valid private key check
            if (!config.PRIVATE_KEY || config.PRIVATE_KEY.length < 64) {
                logger.error('[ExplorationScheduler] Invalid PRIVATE_KEY config, cannot trigger return');
                return;
            }

            // Update local status first to prevent duplicate triggers
            await prisma.travel.update({
                where: { id: frog.travelId },
                data: {
                    crossChainStatus: CrossChainStatus.CROSSING_BACK
                }
            });

            logger.info(`[ExplorationScheduler] Triggering auto-return for frog ${frog.tokenId} on chain ${frog.targetChainId}`);
            
            notifyCrossChainStatus(frog.tokenId, {
                stage: 'returning',
                message: '干粮已耗尽，正在自动办理返程手续...'
            });

            const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
            const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
            const connector = new ethers.Contract(
                chainConfig.connectorAddress,
                FROG_CONNECTOR_ABI,
                wallet
            );

            // Call autoReturnFrog
            const tx = await connector.autoReturnFrog(frog.tokenId);
            logger.info(`[ExplorationScheduler] Return tx sent: ${tx.hash}`);
            
            await tx.wait();
            logger.info(`[ExplorationScheduler] Return tx confirmed for frog ${frog.tokenId}`);

            // Remove from scheduler
            this.removeExploringFrog(frog.tokenId);

        } catch (err) {
            logger.error(`[ExplorationScheduler] Failed to trigger return for frog ${frog.tokenId}:`, err);
            
            // Revert local status change if failed (optional, but safer)
            // But leaving it might prevent infinite loop of failing txs. 
            // Better to keep it and retry later? 
            // For now, let's keep it simplest: if it fails, the next tick won't check it because we removed it? 
            // No, we removed it ONLY on success. If fail, it stays in map and will be retried next tick.
        }
    }

    /**
     * Update active address pools on each chain
     */
    private async updateAddressPools(): Promise<void> {
        for (const [chainId, config] of this.chainConfigs) {
            try {
                await this.updateChainAddressPool(chainId, config);
            } catch (err) {
                logger.error(`[ExplorationScheduler] Failed to update pool for chain ${chainId}:`, err);
            }
        }
    }
    
    /**
     * Update local frog pool from database
     * 获取系统内所有已注册用户的钱包地址，用于青蛙串门
     */
    private async updateLocalFrogPool(): Promise<void> {
        try {
            const frogs = await prisma.frog.findMany({
                select: {
                    ownerAddress: true,
                    name: true
                },
                distinct: ['ownerAddress'],
                take: 100
            });
            
            this.localFrogPool = frogs.map(f => ({
                address: f.ownerAddress,
                name: f.name
            }));
            
            logger.info(`[ExplorationScheduler] Updated local frog pool: ${this.localFrogPool.length} registered users`);
        } catch (err) {
            logger.error('[ExplorationScheduler] Failed to update local frog pool:', err);
            this.localFrogPool = [];
        }
    }

    /**
     * Update address pool for a specific chain using block explorer API
     */
    private async updateChainAddressPool(
        chainId: number,
        chainConfig: { rpcUrl: string; connectorAddress: string; explorerApi: string }
    ): Promise<void> {
        if (!chainConfig.explorerApi || !chainConfig.rpcUrl) return;

        // Fetch recent transactions from explorer API
        // This is a simplified example - you'd want to use proper API keys
        const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
        
        // Get recent blocks and extract unique addresses
        const currentBlock = await provider.getBlockNumber();
        const addresses: Set<string> = new Set();

        // Sample 10 random recent blocks
        for (let i = 0; i < 10; i++) {
            const blockNum = currentBlock - Math.floor(Math.random() * 100);
            try {
                const block = await provider.getBlock(blockNum, true);
                if (block?.prefetchedTransactions) {
                    for (const tx of block.prefetchedTransactions.slice(0, 10)) {
                        if (tx.to) addresses.add(tx.to);
                    }
                }
            } catch {
                // Skip failed blocks
            }
        }

        if (addresses.size === 0) return;

        if (addresses.size === 0) return;

        // Valid private key check
        if (!config.PRIVATE_KEY || config.PRIVATE_KEY.length < 64) {
            logger.warn(`[ExplorationScheduler] Invalid PRIVATE_KEY config, skipping chain ${chainId} pool update`);
            return;
        }

        try {
            const addressArray = Array.from(addresses).slice(0, 50); // Limit to 50
            
            // Save to local cache (no gas required)
            this.localAddressPools.set(chainId, addressArray);
            logger.info(`[ExplorationScheduler] Updated local address pool for chain ${chainId}: ${addressArray.length} addresses`);
            
            // Skip on-chain update (requires gas) - local cache is sufficient for exploration
            // If you want on-chain update, uncomment below:
            /*
            const wallet = new ethers.Wallet(config.PRIVATE_KEY, provider);
            const connector = new ethers.Contract(
                chainConfig.connectorAddress,
                FROG_CONNECTOR_ABI,
                wallet
            );
            const tx = await connector.updateActiveAddressPool(addressArray);
            await tx.wait();
            logger.info(`[ExplorationScheduler] Updated on-chain address pool for chain ${chainId}: ${addressArray.length} addresses`);
            */
        } catch (err) {
            logger.error(`[ExplorationScheduler] Failed to update pool on chain ${chainId}:`, err);
        }
    }
    
    /**
     * Get chain activity factor for dynamic exploration interval
     * Returns a multiplier: 0.5 (very active) to 1.5 (less active)
     */
    private async getChainActivityFactor(chainId: number): Promise<number> {
        const chainConfig = this.chainConfigs.get(chainId);
        if (!chainConfig || !chainConfig.rpcUrl) {
            return 1.0; // Default: no adjustment
        }
        
        try {
            const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
            
            // Get recent block to check activity
            const latestBlock = await provider.getBlock('latest');
            if (!latestBlock) return 1.0;
            
            const txCount = latestBlock.transactions?.length || 0;
            
            // Calculate factor based on transaction density
            // High activity (>100 tx/block) = more frequent exploration (0.6)
            // Medium activity (50-100) = normal exploration (0.8)
            // Low activity (<50) = less frequent exploration (1.2)
            let factor: number;
            if (txCount > 100) {
                factor = 0.6;
            } else if (txCount > 50) {
                factor = 0.8;
            } else if (txCount > 20) {
                factor = 1.0;
            } else {
                factor = 1.2;
            }
            
            // Chain-specific adjustments
            const chainMultiplier: Record<number, number> = {
                97: 1.0,        // BSC Testnet - balanced
                11155111: 1.1,  // Sepolia - slightly slower
                1: 1.5,         // Mainnet - much slower (expensive)
            };
            
            return factor * (chainMultiplier[chainId] || 1.0);
        } catch (error) {
            logger.warn(`[ExplorationScheduler] Failed to get chain activity for ${chainId}:`, error);
            return 1.0; // Default on error
        }
    }
}

// Export singleton
export const explorationScheduler = new ExplorationSchedulerService();

