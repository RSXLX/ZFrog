import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { FrogWalletReadModel } from './frog-wallet.query';

export interface WalletAssetEventResult {
  emitted: boolean;
  eventId: string | null;
  assetHash: string;
  assetCounts: {
    souvenirs: number;
    badges: number;
    decorations: number;
  };
}

export interface ObserveWalletAssetEventOptions {
  tx?: Prisma.TransactionClient;
  requestId?: string;
  source?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const buildAssetFingerprint = (
  wallet: FrogWalletReadModel
): {
  assetHash: string;
  assetCounts: WalletAssetEventResult['assetCounts'];
} => {
  const payload = {
    frogId: wallet.frogId,
    tokenId: wallet.tokenId,
    chainId: wallet.chainId,
    tbaAddress: wallet.tbaAddress.toLowerCase(),
    souvenirIds: wallet.assets.souvenirs.map((item) => item.id).sort((a, b) => a - b),
    badgeIds: wallet.assets.badges.map((item) => item.id).sort(),
    decorationIds: wallet.assets.decorations.map((item) => item.id).sort(),
  };

  const assetHash = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return {
    assetHash,
    assetCounts: {
      souvenirs: payload.souvenirIds.length,
      badges: payload.badgeIds.length,
      decorations: payload.decorationIds.length,
    },
  };
};

const parsePreviousAssetHash = (payload: Prisma.JsonValue | null): string | null => {
  if (!isRecord(payload)) {
    return null;
  }
  const hash = payload.assetHash;
  if (typeof hash !== 'string' || !hash.trim()) {
    return null;
  }
  return hash;
};

export class FrogWalletAssetEventService {
  async observeWalletAssets(
    wallet: FrogWalletReadModel,
    options?: ObserveWalletAssetEventOptions
  ): Promise<WalletAssetEventResult> {
    const db = options?.tx || prisma;
    const fingerprint = buildAssetFingerprint(wallet);

    const latest = await db.domainEvent.findFirst({
      where: {
        aggregateType: 'Wallet',
        aggregateId: String(wallet.frogId),
        eventType: 'FrogWalletAssetChanged',
      },
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        payload: true,
      },
    });

    const previousAssetHash = parsePreviousAssetHash(latest?.payload ?? null);
    if (previousAssetHash === fingerprint.assetHash) {
      return {
        emitted: false,
        eventId: null,
        assetHash: fingerprint.assetHash,
        assetCounts: fingerprint.assetCounts,
      };
    }

    const created = await db.domainEvent.create({
      data: {
        frogId: wallet.frogId,
        aggregateType: 'Wallet',
        aggregateId: String(wallet.frogId),
        eventType: 'FrogWalletAssetChanged',
        payload: {
          frogId: wallet.frogId,
          tokenId: wallet.tokenId,
          chainId: wallet.chainId,
          tbaAddress: wallet.tbaAddress.toLowerCase(),
          tbaSource: wallet.tbaSource,
          assetHash: fingerprint.assetHash,
          assetCounts: fingerprint.assetCounts,
          milestones: wallet.milestones,
          updatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        requestId: options?.requestId,
        source: options?.source || 'wallet-asset-event.service',
      },
      select: { id: true },
    });

    return {
      emitted: true,
      eventId: created.id.toString(),
      assetHash: fingerprint.assetHash,
      assetCounts: fingerprint.assetCounts,
    };
  }
}

export const frogWalletAssetEventService = new FrogWalletAssetEventService();
