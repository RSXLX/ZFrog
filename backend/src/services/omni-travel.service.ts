/**
 * OmniTravel Service
 * 
 * Manages cross-chain travel functionality:
 * - Initiates cross-chain travels via contract calls
 * - Monitors cross-chain message status
 * - Handles travel completion from target chains
 * - Syncs on-chain state with database
 */

import { PrismaClient, CrossChainStatus, ChainType, TravelStatus, TravelStage, CrossChainMessageStatus, MessageDirection, DiscoveryType } from '@prisma/client';
import { createPublicClient, createWalletClient, http, parseAbi, Hex, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { config } from '../config';
import { logger } from '../utils/logger';
import { explorationService } from './travel/exploration.service';
import { aiService } from './ai.service';
import { ChainKey, getChainConfig, getChainKey } from '../config/chains';
import { observerService } from './observer.service';

const prisma = new PrismaClient();

// Contract ABIs
const OMNI_TRAVEL_ABI = parseAbi([
  'function startCrossChainTravel(uint256 tokenId, uint256 targetChainId, uint256 duration) external payable',
  'function crossChainTravels(uint256 tokenId) external view returns (uint256 tokenId, address owner, uint256 targetChainId, bytes32 outboundMessageId, bytes32 returnMessageId, uint64 startTime, uint64 maxDuration, uint8 status, bytes travelData)',
  'function canStartCrossChainTravel(uint256 tokenId) external view returns (bool)',
  'function emergencyReturn(uint256 tokenId) external',
  'function markTravelCompleted(uint256 tokenId, uint256 xpReward) external',
  'event CrossChainTravelStarted(uint256 indexed tokenId, address indexed owner, uint256 targetChainId, bytes32 messageId, uint64 startTime, uint64 maxDuration)',
  'event CrossChainTravelCompleted(uint256 indexed tokenId, bytes32 messageId, uint256 xpReward, uint256 timestamp)',
  'event CrossChainTravelFailed(uint256 indexed tokenId, bytes32 messageId, string reason, uint256 timestamp)',
  'event EmergencyReturn(uint256 indexed tokenId, address indexed owner, string reason, uint256 timestamp)',
]);

const FROG_CONNECTOR_ABI = parseAbi([
  'function getVisitingFrog(uint256 tokenId) external view returns (address owner, string name, uint64 arrivalTime, uint8 status, uint256 actionsExecuted, uint256 xpEarned)',
  'function isFrogVisiting(uint256 tokenId) external view returns (bool)',
  'event FrogArrived(uint256 indexed tokenId, address indexed owner, string name, bytes32 messageId, uint256 timestamp)',
  'event FrogDeparted(uint256 indexed tokenId, bytes32 returnMessageId, uint256 xpEarned, uint256 actionsExecuted, uint256 timestamp)',
  'event ActionExecuted(uint256 indexed tokenId, uint8 actionType, address target, bool success, uint256 timestamp)',
]);

// ZetaFrogNFT ABI for reading frog status directly
const ZETA_FROG_NFT_ABI = parseAbi([
  'function getFrogStatus(uint256 tokenId) external view returns (uint8)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
]);

// Chain configurations for cross-chain
const CHAIN_CONFIGS: Record<number, {
  name: string;
  chainType: ChainType;
  rpcUrl: string;
  connectorAddress: string;
}> = {
  7001: {
    name: 'ZetaChain Athens',
    chainType: 'ZETACHAIN_ATHENS' as ChainType,
    rpcUrl: config.ZETACHAIN_RPC_URL || 'https://zetachain-athens.g.allthatnode.com/archive/evm',
    connectorAddress: config.OMNI_TRAVEL_ADDRESS || '0x52B090700Ca9fb2EBBbc964fDde60A0513Df7cd7',
  },
  97: {
    name: 'BSC Testnet',
    chainType: 'BSC_TESTNET' as ChainType,
    rpcUrl: config.BSC_TESTNET_RPC_URL || 'https://bsc-testnet-rpc.publicnode.com',
    connectorAddress: config.BSC_CONNECTOR_ADDRESS || '0x1cBD20108cb166D45B32c6D3eCAD551c8d03eAD1',
  },
  11155111: {
    name: 'ETH Sepolia',
    chainType: 'ETH_SEPOLIA' as ChainType,
    rpcUrl: config.ETH_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com',
    connectorAddress: config.SEPOLIA_CONNECTOR_ADDRESS || '0xBfE0D6341E52345d5384D3DD4f106464A377D241',
  },
};

// Convert CrossChainStatus number from contract to enum
function contractStatusToEnum(status: number): CrossChainStatus {
  const statusMap: Record<number, CrossChainStatus> = {
    0: 'LOCKING',
    1: 'LOCKED',
    2: 'CROSSING_OUT',
    3: 'ON_TARGET_CHAIN',
    4: 'CROSSING_BACK',
    5: 'COMPLETED',
    6: 'FAILED',
    7: 'TIMEOUT',
  };
  return statusMap[status] || 'FAILED';
}

export class OmniTravelService {
  private zetaChainClient;
  private walletClient;
  private account;

  constructor() {
    // Initialize ZetaChain client
    this.zetaChainClient = createPublicClient({
      transport: http(CHAIN_CONFIGS[7001].rpcUrl),
    });

    // Initialize wallet client for transactions (if private key available)
    if (config.PRIVATE_KEY) {
      const privateKey = config.PRIVATE_KEY.startsWith('0x') 
        ? config.PRIVATE_KEY as Hex 
        : `0x${config.PRIVATE_KEY}` as Hex;
        
      this.account = privateKeyToAccount(privateKey);
      this.walletClient = createWalletClient({
        account: this.account,
        transport: http(CHAIN_CONFIGS[7001].rpcUrl),
      });
    }
  }

  /**
   * Check if a frog can start cross-chain travel
   */
  async canStartCrossChainTravel(tokenId: number, targetChainId: number): Promise<{
    canStart: boolean;
    reason?: string;
  }> {
    try {
      // Check chain support
      if (!CHAIN_CONFIGS[targetChainId]) {
        logger.warn(`Target chain not supported: ${targetChainId}`);
        return { canStart: false, reason: 'Target chain not supported' };
      }

      const connectorAddress = CHAIN_CONFIGS[7001].connectorAddress as Hex;
      logger.info(`Checking eligibility on contract: ${connectorAddress}, tokenId: ${tokenId}`);

      // Check on-chain status via OmniTravel contract
      let canStart = false;
      try {
        canStart = await this.zetaChainClient.readContract({
          address: connectorAddress,
          abi: OMNI_TRAVEL_ABI,
          functionName: 'canStartCrossChainTravel',
          args: [BigInt(tokenId)],
        }) as boolean;
        logger.info(`Contract returned canStart: ${canStart} for tokenId: ${tokenId}`);
      } catch (err) {
        logger.error(`Contract call failed: ${err}`);
        return { canStart: false, reason: 'Failed to read contract status' };
      }

      // If chain says cannot start, check if we need to unlock stuck frog
      if (!canStart) {
        logger.info(`[Eligibility] Token ${tokenId} cannot start on chain, checking if stuck...`);
        
        // Check database - if no active travel exists, the frog might be stuck
        const activeDbTravel = await prisma.travel.findFirst({
          where: {
            frog: { tokenId },
            status: { in: ['Active', 'Processing'] },
          },
        });
        
        if (!activeDbTravel) {
          // DB has no active travel but chain says cannot start -> frog is stuck
          logger.warn(`[Eligibility] Frog ${tokenId} is stuck on chain! Attempting emergency unlock...`);
          
          // Try to call markTravelCompleted to unlock
          try {
            if (config.PRIVATE_KEY && config.OMNI_TRAVEL_ADDRESS) {
              const privateKey = config.PRIVATE_KEY.startsWith('0x') 
                ? config.PRIVATE_KEY as Hex 
                : `0x${config.PRIVATE_KEY}` as Hex;
              const account = privateKeyToAccount(privateKey);
              const walletClient = createWalletClient({
                account,
                transport: http(CHAIN_CONFIGS[7001].rpcUrl),
              });
              
              const hash = await walletClient.writeContract({
                address: config.OMNI_TRAVEL_ADDRESS as Hex,
                abi: OMNI_TRAVEL_ABI,
                functionName: 'markTravelCompleted',
                args: [BigInt(tokenId), BigInt(0)], // 0 XP for emergency unlock
                chain: { id: 7001, name: 'ZetaChain Athens', nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 }, rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } } } as any,
              });
              
              logger.info(`[EmergencyUnlock] Sent tx: ${hash}`);
              
              // Wait a bit for transaction to be included
              await new Promise(resolve => setTimeout(resolve, 3000));
              
              // Re-check eligibility
              const recheckResult = await this.zetaChainClient.readContract({
                address: CHAIN_CONFIGS[7001].connectorAddress as Hex,
                abi: OMNI_TRAVEL_ABI,
                functionName: 'canStartCrossChainTravel',
                args: [BigInt(tokenId)],
              }) as boolean;
              
              if (recheckResult) {
                logger.info(`[EmergencyUnlock] Success! Frog ${tokenId} is now unlocked.`);
                return { canStart: true };
              }
            }
          } catch (unlockErr) {
            logger.error(`[EmergencyUnlock] Failed to unlock frog ${tokenId}:`, unlockErr);
          }
          
          return { canStart: false, reason: '青蛙状态卡住，请联系管理员或稍后重试' };
        }
        
        // There is an active travel in DB
        return { canStart: false, reason: '青蛙正在旅行中' };
      }

      // PRE-SYNC: If chain says can start, sync DB to match chain state
      if (canStart) {
        await this.syncCrossChainTravelState(tokenId);
      }

      // Check database for active travels (after sync)
      const activeTravel = await prisma.travel.findFirst({
        where: {
          frog: { tokenId },
          status: { in: ['Active', 'Processing'] },
        },
      });

      if (activeTravel) {
        // If chain says can start but DB has active travel, the DB is stale
        // This shouldn't happen after sync, but log if it does
        logger.warn(`DB still has active travel ${activeTravel.id} after sync - force completing`);
        await prisma.travel.update({
          where: { id: activeTravel.id },
          data: {
            status: 'Completed',
            completedAt: new Date(),
            errorMessage: 'Auto-completed during chain sync (stale record)',
          },
        });
      }

      return { canStart: true };
    } catch (error) {
      logger.error('Error checking cross-chain travel eligibility:', error);
      return { canStart: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Create a cross-chain travel record in database
   * The actual blockchain transaction should be initiated by the frontend
   */
  async createCrossChainTravelRecord(
    frogId: number,
    tokenId: number,
    targetChainId: number,
    duration: number,
    ownerAddress: string
  ): Promise<{ travelId: number }> {
    const chainConfig = CHAIN_CONFIGS[targetChainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${targetChainId}`);
    }

    const travel = await prisma.travel.create({
      data: {
        frogId,
        targetWallet: '0x0000000000000000000000000000000000000000', // No specific target for cross-chain
        targetChain: chainConfig.chainType,
        chainId: targetChainId,
        isRandom: false,
        startTime: new Date(),
        endTime: new Date(Date.now() + duration * 1000),
        duration,
        status: 'Active',
        currentStage: 'DEPARTING',
        progress: 0,
        isCrossChain: true,
        crossChainStatus: 'LOCKING',
      },
    });

    logger.info(`Created cross-chain travel record: ${travel.id} for frog ${tokenId} to chain ${targetChainId}`);

    return { travelId: travel.id };
  }

  /**
   * Update travel record when blockchain transaction is confirmed
   */
  async onCrossChainTravelStarted(
    travelId: number,
    messageId: string,
    txHash: string
  ): Promise<void> {
    await prisma.travel.update({
      where: { id: travelId },
      data: {
        crossChainMessageId: messageId,
        lockTxHash: txHash,
        crossChainStatus: 'CROSSING_OUT',
        currentStage: 'CROSSING',
        progress: 20,
      },
    });

    // Also create a CrossChainMessage record
    const travel = await prisma.travel.findUnique({
      where: { id: travelId },
      include: { frog: true },
    });

    if (travel) {
      await prisma.crossChainMessage.create({
        data: {
          messageId,
          tokenId: travel.frog.tokenId,
          sourceChain: 'ZETACHAIN_ATHENS',
          targetChain: travel.targetChain,
          direction: 'OUT',
          status: 'PENDING',
          sendTxHash: txHash,
          payload: {
            travelId,
            duration: travel.duration,
          },
          sentAt: new Date(),
        },
      });
    }

    logger.info(`Cross-chain travel started: ${travelId}, messageId: ${messageId}`);
  }

  /**
   * Update travel status when frog arrives at target chain
   */
  async onFrogArrivedAtTarget(
    tokenId: number,
    messageId: string,
    arrivalTime: Date
  ): Promise<void> {
    // Update travel record
    await prisma.travel.updateMany({
      where: {
        frog: { tokenId },
        isCrossChain: true,
        crossChainMessageId: messageId,
      },
      data: {
        crossChainStatus: 'ON_TARGET_CHAIN',
        currentStage: 'EXPLORING',
        progress: 50,
        targetChainArrivalTime: arrivalTime,
      },
    });

    // Update message status
    await prisma.crossChainMessage.updateMany({
      where: { messageId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: arrivalTime,
      },
    });

    logger.info(`Frog ${tokenId} arrived at target chain, messageId: ${messageId}`);
  }

  /**
   * Handle frog completion and return from target chain
   */
  async onCrossChainTravelCompleted(
    tokenId: number,
    returnMessageId: string,
    xpEarned: number,
    txHash: string
  ): Promise<void> {
    // Find the active cross-chain travel
    const travel = await prisma.travel.findFirst({
      where: {
        frog: { tokenId },
        isCrossChain: true,
        crossChainStatus: { in: ['ON_TARGET_CHAIN', 'CROSSING_BACK'] },
      },
    });

    if (!travel) {
      logger.warn(`No active cross-chain travel found for token ${tokenId}`);
      return;
    }

    // Update travel record
    await prisma.travel.update({
      where: { id: travel.id },
      data: {
        status: 'Completed',
        crossChainStatus: 'COMPLETED',
        currentStage: 'RETURNING',
        progress: 100,
        returnMessageId,
        unlockTxHash: txHash,
        crossChainXpEarned: xpEarned,
        completedAt: new Date(),
      },
    });

    // Create return message record
    await prisma.crossChainMessage.create({
      data: {
        messageId: returnMessageId,
        tokenId,
        sourceChain: travel.targetChain,
        targetChain: 'ZETACHAIN_ATHENS',
        direction: 'BACK',
        status: 'CONFIRMED',
        receiveTxHash: txHash,
        payload: {
          travelId: travel.id,
          xpEarned,
        },
        sentAt: new Date(),
        confirmedAt: new Date(),
      },
    });

    logger.info(`Cross-chain travel completed for token ${tokenId}, XP earned: ${xpEarned}`);
  }

  /**
   * Handle failed cross-chain travel
   */
  async onCrossChainTravelFailed(
    tokenId: number,
    messageId: string,
    reason: string
  ): Promise<void> {
    await prisma.travel.updateMany({
      where: {
        frog: { tokenId },
        isCrossChain: true,
        crossChainMessageId: messageId,
      },
      data: {
        status: 'Failed',
        crossChainStatus: 'FAILED',
        errorMessage: reason,
      },
    });

    await prisma.crossChainMessage.updateMany({
      where: { messageId },
      data: {
        status: 'FAILED',
      },
    });

    logger.error(`Cross-chain travel failed for token ${tokenId}: ${reason}`);
  }

  /**
   * Get cross-chain travel status from on-chain
   */
  async getCrossChainTravelStatus(tokenId: number): Promise<{
    owner: string;
    targetChainId: number;
    messageId: string;
    startTime: Date;
    maxDuration: number;
    status: CrossChainStatus;
  } | null> {
    try {
      const result = await this.zetaChainClient.readContract({
        address: CHAIN_CONFIGS[7001].connectorAddress as Hex,
        abi: OMNI_TRAVEL_ABI,
        functionName: 'crossChainTravels',
        args: [BigInt(tokenId)],
      }) as [bigint, string, bigint, string, string, bigint, bigint, number, string];

      const [id, owner, targetChainId, messageId, returnMessageId, startTime, maxDuration, status, travelData] = result;

      if (owner === '0x0000000000000000000000000000000000000000') {
        return null; // No active travel
      }

      return {
        owner,
        targetChainId: Number(targetChainId),
        messageId,
        startTime: new Date(Number(startTime) * 1000),
        maxDuration: Number(maxDuration),
        status: contractStatusToEnum(status),
      };
    } catch (error) {
      logger.error(`Error getting cross-chain travel status for token ${tokenId}:`, error);
      return null;
    }
  }

  /**
   * Check for visiting frog on target chain
   */
  async checkVisitingFrogOnChain(tokenId: number, targetChainId: number): Promise<{
    isVisiting: boolean;
    owner?: string;
    name?: string;
    arrivalTime?: Date;
    actionsExecuted?: number;
    xpEarned?: number;
  }> {
    const chainConfig = CHAIN_CONFIGS[targetChainId];
    if (!chainConfig) {
      return { isVisiting: false };
    }

    try {
      const targetClient = createPublicClient({
        transport: http(chainConfig.rpcUrl),
      });

      const isVisiting = await targetClient.readContract({
        address: chainConfig.connectorAddress as Hex,
        abi: FROG_CONNECTOR_ABI,
        functionName: 'isFrogVisiting',
        args: [BigInt(tokenId)],
      }) as boolean;

      if (!isVisiting) {
        return { isVisiting: false };
      }

      const result = await targetClient.readContract({
        address: chainConfig.connectorAddress as Hex,
        abi: FROG_CONNECTOR_ABI,
        functionName: 'getVisitingFrog',
        args: [BigInt(tokenId)],
      }) as [string, string, bigint, number, bigint, bigint];

      const [owner, name, arrivalTime, , actionsExecuted, xpEarned] = result;

      return {
        isVisiting: true,
        owner,
        name,
        arrivalTime: new Date(Number(arrivalTime) * 1000),
        actionsExecuted: Number(actionsExecuted),
        xpEarned: Number(xpEarned),
      };
    } catch (error) {
      logger.error(`Error checking visiting frog on chain ${targetChainId}:`, error);
      return { isVisiting: false };
    }
  }

  /**
   * Sync database state with on-chain state
   */
  async syncCrossChainTravelState(tokenId: number): Promise<void> {
    const onChainStatus = await this.getCrossChainTravelStatus(tokenId);
    
    if (!onChainStatus) {
      return;
    }

    // Find matching travel record
    const travel = await prisma.travel.findFirst({
      where: {
        frog: { tokenId },
        isCrossChain: true,
        status: { in: ['Active', 'Processing'] },
      },
    });

    if (!travel) {
      return;
    }

    // Update if status differs
    if (travel.crossChainStatus !== onChainStatus.status) {
      const updates: any = {
        crossChainStatus: onChainStatus.status,
      };

      // If completed on chain, mark completed in DB
      if (onChainStatus.status === CrossChainStatus.COMPLETED || onChainStatus.status === CrossChainStatus.FAILED) {
        updates.status = TravelStatus.Completed; // Prisma TravelStatus enum uses Title Case (usually) or check schema
        updates.endTime = new Date();
        updates.progress = 100;
        
        // Also ensure frog status is Idle
        await prisma.frog.update({
          where: { tokenId },
          data: { status: 'Idle' },
        });
      }

      await prisma.travel.update({
        where: { id: travel.id },
        data: updates,
      });

      logger.info(`Synced cross-chain status for travel ${travel.id}: ${onChainStatus.status} -> DB Updated`);
    }
  }

  /**
   * Get all active cross-chain travels
   */
  async getActiveCrossChainTravels(): Promise<any[]> {
    return prisma.travel.findMany({
      where: {
        isCrossChain: true,
        status: { in: ['Active', 'Processing'] },
      },
      include: {
        frog: true,
      },
      orderBy: {
        startTime: 'desc',
      },
    });
  }

  /**
   * Get supported chains for cross-chain travel
   */
  getSupportedChains(): { chainId: number; name: string; chainType: ChainType }[] {
    return Object.entries(CHAIN_CONFIGS)
      .filter(([chainId]) => chainId !== '7001') // Exclude ZetaChain itself
      .map(([chainId, config]) => ({
        chainId: parseInt(chainId),
        name: config.name,
        chainType: config.chainType,
      }));
  }

  /**
   * Check and complete expired cross-chain travels
   * Called periodically by scheduler
   */
  async checkAndCompleteExpiredTravels(): Promise<number> {
    const now = new Date();
    
    // Find all expired active cross-chain travels
    const expiredTravels = await prisma.travel.findMany({
      where: {
        isCrossChain: true,
        status: { in: ['Active', 'Processing'] },
        endTime: { lte: now },
      },
      include: {
        frog: true,
      },
    });

    if (expiredTravels.length === 0) {
      return 0;
    }

    logger.info(`Found ${expiredTravels.length} expired cross-chain travels to complete`);

    let completedCount = 0;
    for (const travel of expiredTravels) {
      try {
        await this.completeCrossChainTravel(travel.frog.tokenId, travel.id);
        completedCount++;
      } catch (error) {
        logger.error(`Failed to complete travel ${travel.id}:`, error);
      }
    }

    return completedCount;
  }

  /**
   * Complete a cross-chain travel with exploration and diary generation
   */
  async completeCrossChainTravel(tokenId: number, travelId?: number): Promise<void> {
    // Find the travel record
    const travel = travelId 
      ? await prisma.travel.findUnique({ where: { id: travelId }, include: { frog: true } })
      : await prisma.travel.findFirst({
          where: {
            frog: { tokenId },
            isCrossChain: true,
            status: { in: ['Active', 'Processing'] },
          },
          include: { frog: true },
        });

    if (!travel) {
      logger.warn(`No active cross-chain travel found for token ${tokenId}`);
      return;
    }

    // Calculate XP reward based on duration
    const durationHours = travel.duration / 3600;
    const baseXP = 50;
    const xpReward = Math.floor(baseXP + (durationHours * 20));

    // ========== Block Exploration ==========
    let explorationResult = null;
    let journalContent = null;
    const targetChainId = travel.targetChain ? parseInt(travel.targetChain) : 97;
    const chainKey = this.chainIdToKey(targetChainId);
    
    try {
      logger.info(`[CrossChain] Starting block exploration for travel ${travel.id} on chain ${chainKey}`);
      
      // Get a random block to explore
      const blockNumber = await explorationService.pickRandomBlock(chainKey);
      
      // Get a random target address for exploration (exclude frog owner's wallet)
      const frogOwnerWallet = travel.targetWallet || '';
      const targetAddress = await explorationService.getRandomTargetAddress(chainKey, [frogOwnerWallet]);
      
      // Perform exploration
      explorationResult = await explorationService.explore(chainKey, blockNumber, targetAddress);
      
      logger.info(`[CrossChain] Exploration complete: ${explorationResult.discoveries.length} discoveries`);
      
      // Save discoveries to database
      for (const discovery of explorationResult.discoveries) {
        await prisma.travelDiscovery.create({
          data: {
            travelId: travel.id,
            type: this.mapDiscoveryType(discovery.type),
            title: discovery.title,
            description: discovery.description,
            rarity: discovery.rarity,
            blockNumber: blockNumber,
            chainType: this.chainIdToChainType(targetChainId),
            metadata: explorationResult.snapshot ? JSON.parse(JSON.stringify({
              snapshot: explorationResult.snapshot,
              timestamp: explorationResult.timestamp,
            })) : undefined,
          },
        });
      }
      
      logger.info(`[CrossChain] Saved ${explorationResult.discoveries.length} discoveries for travel ${travel.id}`);
      
    } catch (exploreError) {
      logger.error(`[CrossChain] Exploration failed for travel ${travel.id}:`, exploreError);
      // Continue with completion even if exploration fails
    }

    // ========== AI Diary Generation ==========
    try {
      const chainConfig = getChainConfig(chainKey);
      const discoveries = explorationResult?.discoveries || [];
      
      // Enhance: Observe the wallet to get rich data for AI
      // Use the address from exploration snapshot, or fallback to a new random one
      const targetAddress = explorationResult?.snapshot?.address || 
                           (await explorationService.getRandomTargetAddress(chainKey)) || 
                           '0x0000000000000000000000000000000000000000';
                           
      logger.info(`[CrossChain] Observing wallet ${targetAddress} for AI context`);
      
      // Observe wallet for better context
      const observation = await observerService.observeWallet(
          targetAddress,
          new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
          new Date(),
          targetChainId
      );
      
      // Build Enhanced Context
      const context = {
          frog: {
              name: travel.frog.name,
              personality: 'curious',
              level: travel.frog.level
          },
          chain: {
              name: chainConfig?.displayName || `Chain ${targetChainId}`,
              chainId: targetChainId,
              vibe: chainConfig?.vibe,
              scenery: chainConfig?.scenery
          },
          wallet: {
              address: targetAddress,
              balance: observation.nativeBalance || '0',
              balanceFormatted: `${parseFloat(observation.nativeBalance || '0').toFixed(4)} ${chainConfig?.nativeSymbol || 'ETH'}`,
              tokens: [], // Observer service currently does not return detailed token assets
              nfts: [], 
              txCount: observation.totalTxCount,
              isContract: false,
              lastActivity: '近期'
          },
          travel: {
              duration: Math.ceil(durationHours),
              isRandom: true,
              source: 'chain_pool' as const
          }
      };
      
      // Generate Journal via AI
      const journal = await aiService.generateJournalEnhanced(context);
      
      // Combine AI content with discoveries if any
      journalContent = journal.content;
      
      if (discoveries.length > 0) {
          journalContent += `\n\n### 探索发现\n`;
          for (const d of discoveries) {
            journalContent += `- **${d.title}**: ${d.description}\n`;
          }
      }
      
      logger.info(`[CrossChain] AI Journal generated with rich context for travel ${travel.id}`);
       
    } catch (aiError) {
      logger.error(`[CrossChain] AI Diary generation failed:`, aiError);
      
      // Fallback
      if (!journalContent) {
          const chainConfig = getChainConfig(chainKey);
          journalContent = `今天，${travel.frog.name} 穿越了 ZetaChain 的彩虹桥，来到了 ${chainConfig?.displayName || `Chain ${targetChainId}`}。这里充满了未知的惊喜！`;
      }
    }


    // ========== Update Travel Record ==========
    await prisma.travel.update({
      where: { id: travel.id },
      data: {
        status: 'Completed',
        crossChainStatus: 'COMPLETED',
        currentStage: 'RETURNING',
        progress: 100,
        completedAt: new Date(),
        crossChainXpEarned: xpReward,
        journalContent: journalContent,
        exploredBlock: explorationResult ? BigInt(explorationResult.blockNumber.toString()) : null,
        exploredSnapshot: explorationResult?.snapshot ? JSON.parse(JSON.stringify(explorationResult.snapshot)) : undefined,
      },
    });

    // Update frog status to Idle (database)
    await prisma.frog.update({
      where: { id: travel.frogId },
      data: {
        status: 'Idle',
        xp: { increment: xpReward },
      },
    });

    logger.info(`Completed cross-chain travel ${travel.id} for token ${tokenId}, XP: ${xpReward}`);

    // ========== On-Chain Unlock: Call markTravelCompleted to unlock frog ==========
    try {
      if (config.PRIVATE_KEY && config.OMNI_TRAVEL_ADDRESS) {
        const account = privateKeyToAccount(config.PRIVATE_KEY as Hex);
        const omniTravelClient = createWalletClient({
          account,
          chain: { id: 7001, name: 'ZetaChain Athens', nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 }, rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } } } as any,
          transport: http(config.ZETACHAIN_RPC_URL),
        });
        const zetaChainDef = { id: 7001, name: 'ZetaChain Athens', nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 }, rpcUrls: { default: { http: [config.ZETACHAIN_RPC_URL] } } } as const;
        
        const hash = await omniTravelClient.writeContract({
          address: config.OMNI_TRAVEL_ADDRESS as Hex,
          abi: OMNI_TRAVEL_ABI,
          functionName: 'markTravelCompleted',
          args: [BigInt(tokenId), BigInt(xpReward)],
          chain: zetaChainDef as any,
        });
        
        logger.info(`[OnChain] markTravelCompleted tx sent: ${hash}`);
      } else {
        logger.warn('[OnChain] Missing PRIVATE_KEY or OMNI_TRAVEL_ADDRESS, skipping on-chain unlock');
      }
    } catch (onChainError) {
      logger.error('[OnChain] Failed to call markTravelCompleted:', onChainError);
      // Continue even if on-chain call fails - database is already updated
    }

    // ========== Phase 12: Souvenir Generation (50% chance) ==========
    const discoveries = explorationResult?.discoveries || [];
    let souvenirId: number | null = null;
    
    if (Math.random() < 0.5) {
      try {
        // Check if travel already has a souvenir
        const existingTravel = await prisma.travel.findUnique({
          where: { id: travel.id },
          select: { souvenirId: true }
        });
        
        if (existingTravel?.souvenirId) {
          souvenirId = existingTravel.souvenirId;
          logger.info(`[CrossChain] Travel ${travel.id} already has souvenir ${souvenirId}`);
        } else {
          // Determine rarity based on discoveries
          const maxRarity = discoveries.length > 0
            ? Math.max(...discoveries.map(d => d.rarity))
            : 1;
          const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
          const rarityName = rarityNames[Math.min(maxRarity - 1, 4)] || 'Common';
          
          const chainConfig = getChainConfig(chainKey);
          const souvenir = await prisma.souvenir.create({
            data: {
              frogId: travel.frogId,
              name: `${chainConfig?.displayName || 'Unknown Chain'} 探索纪念品`,
              rarity: rarityName as any,
              chainType: this.chainIdToChainType(targetChainId),
              tokenId: 0, // Non-chain souvenir
              mintedAt: new Date(),
            }
          });
          souvenirId = souvenir.id;
          
          // Link souvenir to travel
          await prisma.travel.update({
            where: { id: travel.id },
            data: { souvenirId: souvenir.id }
          });
          
          logger.info(`[CrossChain] Generated souvenir ${souvenir.id} (${rarityName}) for travel ${travel.id}`);
        }
      } catch (souvenirError) {
        logger.warn('[CrossChain] Souvenir generation failed:', souvenirError);
      }
    }

    // ========== Phase 12: Badge Auto-Unlock ==========
    try {
      // First update frog stats (required for badge conditions)
      const { travelP0Service } = await import('./travel/travel-p0.service');
      const explorationBlock = explorationResult?.blockNumber ? BigInt(explorationResult.blockNumber.toString()) : BigInt(0);
      await travelP0Service.updateFrogStats(
        travel.id,
        chainKey,
        discoveries,
        explorationBlock,
        new Date()
      );
      logger.info(`[CrossChain] Updated frog stats for travel ${travel.id} on ${chainKey}`);
      
      // Then check badges
      const { badgeService } = await import('./badge/badge.service');
      const unlockedBadges = await badgeService.checkAndUnlock(travel.frogId, {
        chain: chainKey,
        travelId: travel.id,
        discoveries: discoveries,
      });
      if (unlockedBadges.length > 0) {
        logger.info(`[CrossChain] Unlocked badges: ${unlockedBadges.join(', ')}`);
      } else {
        logger.debug(`[CrossChain] No new badges unlocked for travel ${travel.id}`);
      }
    } catch (badgeError) {
      logger.warn('[CrossChain] Badge/stats update failed:', badgeError);
    }

    // Try to call contract to unlock (if wallet configured)
    if (this.walletClient && this.account) {
      try {
        const connectorAddress = CHAIN_CONFIGS[7001].connectorAddress as Hex;
        const txHash = await this.walletClient.writeContract({
          address: connectorAddress,
          abi: parseAbi(['function markTravelCompleted(uint256 tokenId, uint256 xpReward) external']),
          functionName: 'markTravelCompleted',
          args: [BigInt(tokenId), BigInt(xpReward)],
          chain: { id: 7001, name: 'ZetaChain Athens', nativeCurrency: { name: 'ZETA', symbol: 'ZETA', decimals: 18 }, rpcUrls: { default: { http: [CHAIN_CONFIGS[7001].rpcUrl] } } },
        });
        logger.info(`Sent markTravelCompleted tx: ${txHash}`);
      } catch (contractError) {
        logger.warn(`Failed to call markTravelCompleted on contract (may be test mode):`, contractError);
      }
    }
  }

  // Helper: Map discovery type string to enum
  private mapDiscoveryType(type: string): DiscoveryType {
    const typeMap: Record<string, DiscoveryType> = {
      'balance': 'balance',
      'activity': 'activity',
      'timing': 'timing',
      'fun_fact': 'fun_fact',
      'cross_chain': 'cross_chain',
      'token_holding': 'token_holding',
      'tx_action': 'tx_action',
      'gas_price': 'gas_price',
    };
    return typeMap[type] || 'fun_fact';
  }

  // Helper: Map chain ID to ChainKey
  private chainIdToKey(chainId: number): ChainKey {
    const map: Record<number, ChainKey> = {
      7001: 'ZETACHAIN_ATHENS',
      97: 'BSC_TESTNET',
      11155111: 'ETH_SEPOLIA',
    };
    return map[chainId] || 'ZETACHAIN_ATHENS';
  }

  // Helper: Map chain ID to ChainType
  private chainIdToChainType(chainId: number): ChainType {
    const map: Record<number, ChainType> = {
      7001: 'ZETACHAIN_ATHENS',
      97: 'BSC_TESTNET',
      11155111: 'ETH_SEPOLIA',
    };
    return map[chainId] || 'ZETACHAIN_ATHENS';
  }

  /**
   * Sync frog status from on-chain state to database
   * Chain is the source of truth - if chain says Idle, DB should match
   */
  async syncFrogStatusFromChain(tokenId: number): Promise<void> {
    try {
      const zetaFrogAddress = config.ZETAFROG_NFT_ADDRESS as Hex;
      
      // Read on-chain frog status
      const onChainStatus = await this.zetaChainClient.readContract({
        address: zetaFrogAddress,
        abi: ZETA_FROG_NFT_ABI,
        functionName: 'getFrogStatus',
        args: [BigInt(tokenId)],
      }) as number;

      // Map on-chain status to DB status
      // Contract: 0=Idle, 1=Traveling, 2=CrossChainLocked
      const statusMap: Record<number, 'Idle' | 'Traveling' | 'Returning' | 'CrossChainLocked'> = {
        0: 'Idle',
        1: 'Traveling',
        2: 'CrossChainLocked',  // Added for cross-chain travel
      };
      const newDbStatus = statusMap[onChainStatus] || 'Idle';
      
      logger.debug(`[SyncStatus] Token ${tokenId}: onChain=${onChainStatus}, mapped=${newDbStatus}`);

      // Find frog in database
      const frog = await prisma.frog.findFirst({ where: { tokenId } });
      if (!frog) {
        logger.warn(`Frog ${tokenId} not found in database during sync`);
        return;
      }

      // Update if different
      if (frog.status !== newDbStatus) {
        logger.info(`[Sync] Frog #${tokenId} status mismatch: DB=${frog.status}, Chain=${newDbStatus}`);
        
        await prisma.frog.update({
          where: { id: frog.id },
          data: { status: newDbStatus },
        });

        // If chain says Idle, complete any stale active travels
        if (newDbStatus === 'Idle') {
          const updatedCount = await prisma.travel.updateMany({
            where: {
              frogId: frog.id,
              status: { in: ['Active', 'Processing'] },
            },
            data: {
              status: 'Completed',
              completedAt: new Date(),
              errorMessage: 'Auto-completed during chain sync',
            },
          });
          
          if (updatedCount.count > 0) {
            logger.info(`[Sync] Auto-completed ${updatedCount.count} stale travel(s) for Frog #${tokenId}`);
          }
        }

        logger.info(`[Sync] Frog #${tokenId} status updated: ${frog.status} → ${newDbStatus}`);
      }
    } catch (error) {
      logger.error(`[Sync] Failed to sync frog ${tokenId} status from chain:`, error);
      // Don't throw - sync failure shouldn't block the main flow
    }
  }

  /**
   * Public API for on-demand frog health check
   * Wraps syncFrogStatusFromChain
   */
  async reconcileFrogStatus(tokenId: number): Promise<void> {
    return this.syncFrogStatusFromChain(tokenId);
  }

  /**
   * Reconcile all frogs' status with on-chain state
   * Called periodically by scheduler
   */
  async reconcileAllFrogsStatus(): Promise<{ checked: number; fixed: number }> {
    let checked = 0;
    let fixed = 0;

    try {
      const allFrogs = await prisma.frog.findMany({
        where: { status: { in: ['Traveling', 'Returning'] } }, // Only check non-idle frogs for efficiency
      });

      for (const frog of allFrogs) {
        checked++;
        const beforeStatus = frog.status;
        await this.syncFrogStatusFromChain(frog.tokenId);
        
        // Re-check if status changed
        const afterFrog = await prisma.frog.findUnique({ where: { id: frog.id } });
        if (afterFrog && afterFrog.status !== beforeStatus) {
          fixed++;
        }
      }

      if (fixed > 0) {
        logger.info(`[Reconcile] Checked ${checked} frogs, fixed ${fixed} status mismatches`);
      }
    } catch (error) {
      logger.error('[Reconcile] Failed to reconcile frogs status:', error);
    }

    return { checked, fixed };
  }
}

export const omniTravelService = new OmniTravelService();

