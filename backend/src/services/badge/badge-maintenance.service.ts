import { Prisma, TravelBadge } from '@prisma/client';
import { prisma } from '../../database';
import { CHAIN_ID_TO_KEY, ChainKey } from '../../config/chains';
import { logger } from '../../utils/logger';
import { airdropService } from '../airdrop/airdrop.service';
import { BADGE_DEFINITIONS } from './badge-definitions';

type SupportedBadgeChain = 'BSC_TESTNET' | 'ETH_SEPOLIA' | 'ZETACHAIN_ATHENS';

interface TravelSnapshot {
  id: number;
  startTime: Date;
  endTime: Date;
  completedAt: Date | null;
  duration: number;
  isCrossChain: boolean;
  chainId: number;
  targetChain: string;
  observedTotalValue: string | null;
  exploredBlock: bigint | null;
  exploredTimestamp: Date | null;
  discoveries: Array<{
    rarity: number;
    blockNumber: bigint | null;
  }>;
  interactions: Array<{
    isContract: boolean;
    blockNumber: bigint;
  }>;
  observations: Array<{
    totalValueWei: string;
    nativeBalance: string | null;
  }>;
}

interface BadgeSnapshot {
  frog: {
    id: number;
    tokenId: number;
    ownerAddress: string;
  };
  completedTravels: TravelSnapshot[];
  totalTrips: number;
  chainTrips: Record<SupportedBadgeChain, number>;
  visitedChains: Set<SupportedBadgeChain>;
  maxDiscoveryRarity: number;
  contractCount: number;
  friendshipCount: number;
  messageCount: number;
  giftSentCount: number;
  souvenirCount: number;
  photoCount: number;
  decorationPlacedCount: number;
  earliestBlockVisited: bigint | null;
  oldestVisitedAt: Date | null;
  hasRealCrossChain: boolean;
  longestTravelDurationSeconds: number;
  maxVisitedValueWei: bigint;
}

export interface BadgeSyncDefinitionsResult {
  dryRun: boolean;
  total: number;
  created: number;
  updated: number;
}

export interface FrogBadgeReconcileResult {
  frogId: number;
  tokenId: number;
  ownerAddress: string;
  unlockedBadges: string[];
  createdRewards: string[];
  statsSynced: boolean;
  totalUnlockedBadges: number;
}

export interface BadgeReconcileSummary {
  dryRun: boolean;
  frogsProcessed: number;
  badgesUnlocked: number;
  rewardsCreated: number;
  statsSynced: number;
  results: FrogBadgeReconcileResult[];
  definitionSync?: BadgeSyncDefinitionsResult;
}

export interface ReconcileBadgeOptions {
  dryRun?: boolean;
  createRewards?: boolean;
  syncDefinitions?: boolean;
  syncStats?: boolean;
  ownerAddress?: string;
  unlockedByTravelId?: number | null;
}

export interface ReconcileBadgeTarget {
  frogId?: number;
  tokenId?: number;
}

const SUPPORTED_BADGE_CHAINS: SupportedBadgeChain[] = ['BSC_TESTNET', 'ETH_SEPOLIA', 'ZETACHAIN_ATHENS'];

function isSupportedBadgeChain(value: unknown): value is SupportedBadgeChain {
  return typeof value === 'string' && SUPPORTED_BADGE_CHAINS.includes(value as SupportedBadgeChain);
}

function parseEthToWei(value: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) {
    return BigInt(0);
  }

  const negative = trimmed.startsWith('-');
  const normalized = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ''] = normalized.split('.');
  const wholePart = whole || '0';
  const fractionPart = `${fraction}000000000000000000`.slice(0, 18);
  const result = BigInt(`${wholePart}${fractionPart}`);
  return negative ? -result : result;
}

function normalizeUnlockCondition(value: Prisma.JsonValue): Record<string, any> {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return {};
  }

  return value as Record<string, any>;
}

function getTravelDurationSeconds(travel: TravelSnapshot): number {
  const scheduledDuration = Number.isFinite(travel.duration) ? Math.max(0, travel.duration) : 0;
  const actualEnd = travel.completedAt ?? travel.endTime;
  const actualDuration = Math.max(0, Math.floor((actualEnd.getTime() - travel.startTime.getTime()) / 1000));
  return Math.max(scheduledDuration, actualDuration);
}

class BadgeMaintenanceService {
  async syncDefinitions(options: { dryRun?: boolean } = {}): Promise<BadgeSyncDefinitionsResult> {
    const dryRun = options.dryRun ?? false;
    let created = 0;
    let updated = 0;

    for (const badge of BADGE_DEFINITIONS) {
      const existing = await prisma.travelBadge.findUnique({
        where: { code: badge.code },
        select: { id: true },
      });

      if (existing) {
        updated++;
        if (!dryRun) {
          await prisma.travelBadge.update({
            where: { code: badge.code },
            data: {
              name: badge.name,
              description: badge.description,
              icon: badge.icon,
              unlockType: badge.unlockType,
              unlockCondition: badge.unlockCondition,
              rarity: badge.rarity,
              isHidden: badge.isHidden ?? false,
              airdropEnabled: badge.airdropEnabled ?? false,
              airdropAmount: badge.airdropAmount ?? null,
            },
          });
        }
      } else {
        created++;
        if (!dryRun) {
          await prisma.travelBadge.create({
            data: {
              code: badge.code,
              name: badge.name,
              description: badge.description,
              icon: badge.icon,
              unlockType: badge.unlockType,
              unlockCondition: badge.unlockCondition,
              rarity: badge.rarity,
              isHidden: badge.isHidden ?? false,
              airdropEnabled: badge.airdropEnabled ?? false,
              airdropAmount: badge.airdropAmount ?? null,
            },
          });
        }
      }
    }

    return {
      dryRun,
      total: BADGE_DEFINITIONS.length,
      created,
      updated,
    };
  }

  async reconcileFrogBadges(
    target: ReconcileBadgeTarget,
    options: ReconcileBadgeOptions = {}
  ): Promise<FrogBadgeReconcileResult> {
    const dryRun = options.dryRun ?? false;
    const createRewards = options.createRewards ?? true;

    if (options.syncDefinitions) {
      await this.syncDefinitions({ dryRun });
    }

    const frog = await this.resolveFrog(target);
    if (!frog) {
      throw new Error('Frog not found');
    }

    const snapshot = await this.buildSnapshot(frog.id);
    const statsSynced = options.syncStats ? await this.syncFrogTravelStats(snapshot, dryRun) : false;

    const [badges, userBadges] = await Promise.all([
      prisma.travelBadge.findMany(),
      prisma.userBadge.findMany({
        where: { frogId: frog.id },
        include: {
          badge: true,
          reward: true,
        },
      }),
    ]);

    const orderedBadges = this.orderBadgesForUnlock(badges);
    const existingByBadgeId = new Map(userBadges.map((item) => [item.badgeId, item]));
    const visibleBadgeIds = new Set(
      orderedBadges.filter((badge) => !badge.isHidden).map((badge) => badge.id)
    );

    let visibleUnlockedCount = userBadges.reduce((count, item) => {
      return count + (item.badge.isHidden ? 0 : 1);
    }, 0);

    const unlockedBadges: string[] = [];
    const createdRewards: string[] = [];
    const rewardOwnerAddress = (options.ownerAddress || snapshot.frog.ownerAddress || '').toLowerCase();

    for (const badge of orderedBadges) {
      const existing = existingByBadgeId.get(badge.id);
      const condition = normalizeUnlockCondition(badge.unlockCondition as Prisma.JsonValue);
      const eligible = this.isBadgeEligible(
        badge,
        condition,
        snapshot,
        visibleUnlockedCount,
        visibleBadgeIds.size
      );

      if (!eligible) {
        continue;
      }

      if (!existing) {
        unlockedBadges.push(badge.code);

        if (!dryRun) {
          const created = await prisma.userBadge.create({
            data: {
              frogId: snapshot.frog.id,
              badgeId: badge.id,
              unlockedByTravelId: options.unlockedByTravelId ?? null,
            },
            include: {
              reward: true,
            },
          });

          existingByBadgeId.set(badge.id, {
            ...created,
            badge,
          } as typeof userBadges[number]);
        }

        if (!badge.isHidden) {
          visibleUnlockedCount += 1;
        }
      }

      const current = existingByBadgeId.get(badge.id);
      if (
        createRewards &&
        current &&
        !current.reward &&
        badge.airdropEnabled &&
        badge.airdropAmount &&
        rewardOwnerAddress
      ) {
        createdRewards.push(badge.code);

        if (!dryRun) {
          await airdropService.createRewardRecord(current.id, rewardOwnerAddress, badge.airdropAmount);
          existingByBadgeId.set(badge.id, {
            ...current,
            reward: {
              id: 'created',
            },
          } as typeof userBadges[number]);
        }
      }
    }

    return {
      frogId: snapshot.frog.id,
      tokenId: snapshot.frog.tokenId,
      ownerAddress: snapshot.frog.ownerAddress,
      unlockedBadges,
      createdRewards,
      statsSynced,
      totalUnlockedBadges: userBadges.length + unlockedBadges.length,
    };
  }

  async reconcileOwnerBadges(
    ownerAddress: string,
    options: ReconcileBadgeOptions & { limit?: number } = {}
  ): Promise<BadgeReconcileSummary> {
    const normalized = ownerAddress.toLowerCase();
    const dryRun = options.dryRun ?? false;
    const syncDefinitions = options.syncDefinitions ?? false;
    const createRewards = options.createRewards ?? true;
    const syncStats = options.syncStats ?? false;
    const limit = options.limit;

    const frogs = await prisma.frog.findMany({
      where: { ownerAddress: normalized },
      select: { id: true },
      orderBy: { id: 'asc' },
      ...(limit ? { take: limit } : {}),
    });

    const summary = this.createEmptySummary(dryRun);
    if (syncDefinitions) {
      summary.definitionSync = await this.syncDefinitions({ dryRun });
    }

    for (const frog of frogs) {
      const result = await this.reconcileFrogBadges(
        { frogId: frog.id },
        {
          dryRun,
          createRewards,
          syncDefinitions: false,
          syncStats,
          ownerAddress: normalized,
        }
      );
      this.appendResult(summary, result);
    }

    return summary;
  }

  async reconcileAllFrogs(
    options: ReconcileBadgeOptions & { limit?: number } = {}
  ): Promise<BadgeReconcileSummary> {
    const dryRun = options.dryRun ?? false;
    const syncDefinitions = options.syncDefinitions ?? false;
    const createRewards = options.createRewards ?? true;
    const syncStats = options.syncStats ?? false;
    const limit = options.limit;

    const frogs = await prisma.frog.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
      ...(limit ? { take: limit } : {}),
    });

    const summary = this.createEmptySummary(dryRun);
    if (syncDefinitions) {
      summary.definitionSync = await this.syncDefinitions({ dryRun });
    }

    for (const frog of frogs) {
      const result = await this.reconcileFrogBadges(
        { frogId: frog.id },
        {
          dryRun,
          createRewards,
          syncDefinitions: false,
          syncStats,
        }
      );
      this.appendResult(summary, result);
    }

    return summary;
  }

  private createEmptySummary(dryRun: boolean): BadgeReconcileSummary {
    return {
      dryRun,
      frogsProcessed: 0,
      badgesUnlocked: 0,
      rewardsCreated: 0,
      statsSynced: 0,
      results: [],
    };
  }

  private appendResult(summary: BadgeReconcileSummary, result: FrogBadgeReconcileResult) {
    summary.frogsProcessed += 1;
    summary.badgesUnlocked += result.unlockedBadges.length;
    summary.rewardsCreated += result.createdRewards.length;
    summary.statsSynced += result.statsSynced ? 1 : 0;
    summary.results.push(result);
  }

  private async resolveFrog(target: ReconcileBadgeTarget) {
    if (target.frogId) {
      return prisma.frog.findUnique({
        where: { id: target.frogId },
        select: {
          id: true,
          tokenId: true,
          ownerAddress: true,
        },
      });
    }

    if (target.tokenId) {
      return prisma.frog.findUnique({
        where: { tokenId: target.tokenId },
        select: {
          id: true,
          tokenId: true,
          ownerAddress: true,
        },
      });
    }

    throw new Error('Either frogId or tokenId is required');
  }

  private async buildSnapshot(frogId: number): Promise<BadgeSnapshot> {
    const frog = await prisma.frog.findUnique({
      where: { id: frogId },
      select: {
        id: true,
        tokenId: true,
        ownerAddress: true,
      },
    });

    if (!frog) {
      throw new Error('Frog not found');
    }

    const [completedTravels, friendshipCount, messageCount, souvenirCount, photoCount, decorationPlacedCount] =
      await Promise.all([
        prisma.travel.findMany({
          where: {
            frogId,
            status: 'Completed',
          },
          select: {
            id: true,
            startTime: true,
            endTime: true,
            completedAt: true,
            duration: true,
            isCrossChain: true,
            chainId: true,
            targetChain: true,
            observedTotalValue: true,
            exploredBlock: true,
            exploredTimestamp: true,
            discoveries: {
              select: {
                rarity: true,
                blockNumber: true,
              },
            },
            interactions: {
              select: {
                isContract: true,
                blockNumber: true,
              },
            },
            observations: {
              select: {
                totalValueWei: true,
                nativeBalance: true,
              },
            },
          },
          orderBy: {
            id: 'asc',
          },
        }),
        prisma.friendship.count({
          where: {
            status: 'Accepted',
            OR: [
              { requesterId: frogId },
              { addresseeId: frogId },
            ],
          },
        }),
        prisma.visitorMessage.count({
          where: { fromFrogId: frogId },
        }),
        prisma.souvenir.count({
          where: { frogId },
        }),
        prisma.photo.count({
          where: { frogId },
        }),
        prisma.placedItem.count({
          where: {
            layout: { frogId },
          },
        }),
      ]);

    const giftSentCount = await prisma.gift.count({
      where: { fromAddress: frog.ownerAddress.toLowerCase() },
    });

    const chainTrips: Record<SupportedBadgeChain, number> = {
      BSC_TESTNET: 0,
      ETH_SEPOLIA: 0,
      ZETACHAIN_ATHENS: 0,
    };

    const visitedChains = new Set<SupportedBadgeChain>();
    let maxDiscoveryRarity = 0;
    let contractCount = 0;
    let earliestBlockVisited: bigint | null = null;
    let oldestVisitedAt: Date | null = null;
    let hasRealCrossChain = false;
    let longestTravelDurationSeconds = 0;
    let maxVisitedValueWei = BigInt(0);

    for (const travel of completedTravels as TravelSnapshot[]) {
      const chainKey = CHAIN_ID_TO_KEY[travel.chainId] || (isSupportedBadgeChain(travel.targetChain) ? travel.targetChain : undefined);
      if (chainKey && isSupportedBadgeChain(chainKey)) {
        chainTrips[chainKey] += 1;
        visitedChains.add(chainKey);
      }

      for (const discovery of travel.discoveries) {
        maxDiscoveryRarity = Math.max(maxDiscoveryRarity, discovery.rarity || 0);
        if (discovery.blockNumber !== null) {
          earliestBlockVisited = earliestBlockVisited === null
            ? discovery.blockNumber
            : discovery.blockNumber < earliestBlockVisited
              ? discovery.blockNumber
              : earliestBlockVisited;
        }
      }

      for (const interaction of travel.interactions) {
        if (interaction.isContract) {
          contractCount += 1;
        }
        if (interaction.blockNumber !== null) {
          earliestBlockVisited = earliestBlockVisited === null
            ? interaction.blockNumber
            : interaction.blockNumber < earliestBlockVisited
              ? interaction.blockNumber
              : earliestBlockVisited;
        }
      }

      if (travel.exploredBlock !== null) {
        earliestBlockVisited = earliestBlockVisited === null
          ? travel.exploredBlock
          : travel.exploredBlock < earliestBlockVisited
            ? travel.exploredBlock
            : earliestBlockVisited;
      }

      if (travel.exploredTimestamp) {
        oldestVisitedAt = oldestVisitedAt === null
          ? travel.exploredTimestamp
          : travel.exploredTimestamp.getTime() < oldestVisitedAt.getTime()
            ? travel.exploredTimestamp
            : oldestVisitedAt;
      } else {
        oldestVisitedAt = oldestVisitedAt === null
          ? travel.startTime
          : travel.startTime.getTime() < oldestVisitedAt.getTime()
            ? travel.startTime
            : oldestVisitedAt;
      }

      hasRealCrossChain = hasRealCrossChain || travel.isCrossChain;
      longestTravelDurationSeconds = Math.max(longestTravelDurationSeconds, getTravelDurationSeconds(travel));

      const observedValues = [
        travel.observedTotalValue,
        ...travel.observations.map((item) => item.totalValueWei),
        ...travel.observations.map((item) => item.nativeBalance),
      ];

      for (const value of observedValues) {
        if (!value) {
          continue;
        }
        try {
          const amount = BigInt(value);
          if (amount > maxVisitedValueWei) {
            maxVisitedValueWei = amount;
          }
        } catch (error) {
          logger.warn('[BadgeMaintenance] Failed to parse observed value', { frogId, value, error });
        }
      }
    }

    return {
      frog: {
        id: frog.id,
        tokenId: frog.tokenId,
        ownerAddress: frog.ownerAddress.toLowerCase(),
      },
      completedTravels: completedTravels as TravelSnapshot[],
      totalTrips: completedTravels.length,
      chainTrips,
      visitedChains,
      maxDiscoveryRarity,
      contractCount,
      friendshipCount,
      messageCount,
      giftSentCount,
      souvenirCount,
      photoCount,
      decorationPlacedCount,
      earliestBlockVisited,
      oldestVisitedAt,
      hasRealCrossChain,
      longestTravelDurationSeconds,
      maxVisitedValueWei,
    };
  }

  private async syncFrogTravelStats(snapshot: BadgeSnapshot, dryRun: boolean): Promise<boolean> {
    const data = {
      totalTrips: snapshot.totalTrips,
      bscTrips: snapshot.chainTrips.BSC_TESTNET,
      ethTrips: snapshot.chainTrips.ETH_SEPOLIA,
      zetaTrips: snapshot.chainTrips.ZETACHAIN_ATHENS,
      totalDiscoveries: snapshot.completedTravels.reduce((sum, travel) => sum + travel.discoveries.length, 0),
      rareFinds: snapshot.completedTravels.reduce((sum, travel) => {
        return sum + travel.discoveries.filter((item) => item.rarity >= 4).length;
      }, 0),
      earliestBlockVisited: snapshot.earliestBlockVisited,
      oldestDateVisited: snapshot.oldestVisitedAt,
    };

    if (dryRun) {
      return true;
    }

    await prisma.frogTravelStats.upsert({
      where: { frogId: snapshot.frog.id },
      create: {
        frogId: snapshot.frog.id,
        ...data,
      },
      update: data,
    });

    return true;
  }

  private orderBadgesForUnlock(badges: TravelBadge[]): TravelBadge[] {
    return [...badges].sort((left, right) => {
      if (left.code === 'COMPLETIONIST') {
        return 1;
      }
      if (right.code === 'COMPLETIONIST') {
        return -1;
      }
      if (left.isHidden !== right.isHidden) {
        return left.isHidden ? 1 : -1;
      }
      return left.createdAt.getTime() - right.createdAt.getTime();
    });
  }

  private isBadgeEligible(
    badge: TravelBadge,
    condition: Record<string, any>,
    snapshot: BadgeSnapshot,
    visibleUnlockedCount: number,
    totalVisibleBadgeCount: number
  ): boolean {
    switch (badge.unlockType) {
      case 'TRIP_COUNT':
        return snapshot.totalTrips >= Number(condition.threshold || 0);
      case 'CHAIN_VISIT':
        return isSupportedBadgeChain(condition.chain)
          ? snapshot.chainTrips[condition.chain] >= Number(condition.threshold || 0)
          : false;
      case 'MULTI_CHAIN':
        return snapshot.visitedChains.size >= Number(condition.threshold || 0);
      case 'RARE_FIND':
        return snapshot.maxDiscoveryRarity >= Number(condition.minRarity || 0);
      case 'SOCIAL':
        return this.checkSocialCondition(condition, snapshot);
      case 'COLLECTION':
        return this.checkCollectionCondition(condition, snapshot);
      case 'SPECIAL':
        return this.checkSpecialCondition(condition, snapshot, visibleUnlockedCount, totalVisibleBadgeCount);
      default:
        return false;
    }
  }

  private checkSocialCondition(condition: Record<string, any>, snapshot: BadgeSnapshot): boolean {
    const threshold = Number(condition.threshold || 0);

    switch (condition.metric) {
      case 'friend_count':
        return snapshot.friendshipCount >= threshold;
      case 'message_count':
        return snapshot.messageCount >= threshold;
      case 'gift_sent':
        return snapshot.giftSentCount >= threshold;
      default:
        return false;
    }
  }

  private checkCollectionCondition(condition: Record<string, any>, snapshot: BadgeSnapshot): boolean {
    const threshold = Number(condition.threshold || 0);

    switch (condition.metric) {
      case 'souvenir_count':
        return snapshot.souvenirCount >= threshold;
      case 'photo_count':
        return snapshot.photoCount >= threshold;
      case 'decoration_placed':
        return snapshot.decorationPlacedCount >= threshold;
      default:
        return false;
    }
  }

  private checkSpecialCondition(
    condition: Record<string, any>,
    snapshot: BadgeSnapshot,
    visibleUnlockedCount: number,
    totalVisibleBadgeCount: number
  ): boolean {
    switch (condition.type) {
      case 'departure_hour': {
        if (typeof condition.hour === 'number') {
          return snapshot.completedTravels.some((travel) => travel.startTime.getHours() === condition.hour);
        }

        if (typeof condition.before === 'number') {
          return snapshot.completedTravels.some((travel) => travel.startTime.getHours() < condition.before);
        }

        return false;
      }

      case 'first_real_crosschain':
        return snapshot.hasRealCrossChain;

      case 'whale_wallet_visited':
        return snapshot.maxVisitedValueWei >= parseEthToWei(String(condition.minBalance || '0'));

      case 'contract_count':
        return snapshot.contractCount >= Number(condition.threshold || 0);

      case 'oldest_block':
        return snapshot.earliestBlockVisited !== null
          && snapshot.earliestBlockVisited < BigInt(Number(condition.maxBlock || 0));

      case 'tokenId_lte':
        return snapshot.frog.tokenId <= Number(condition.value || 0);

      case 'tokenId_contains':
        return String(snapshot.frog.tokenId).includes(String(condition.pattern || ''));

      case 'travel_duration':
        return snapshot.longestTravelDurationSeconds >= Number(condition.minSeconds || 0);

      case 'all_visible_badges':
        return totalVisibleBadgeCount > 0 && visibleUnlockedCount >= totalVisibleBadgeCount;

      default:
        return false;
    }
  }
}

export const badgeMaintenanceService = new BadgeMaintenanceService();
