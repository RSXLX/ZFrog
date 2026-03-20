import { HibernationStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';
import { applyLifeDecay, LifeSnapshot } from './state-calculator';

type FrogWithLife = Prisma.FrogGetPayload<{
  include: {
    petState: true;
  };
}>;

export interface LifeReadModel {
  frogId: number;
  tokenId: number;
  name: string;
  walletAddress: string;
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  mood: string;
  isSick: boolean;
  needsClean: boolean;
  isDormant: boolean;
  hibernationStatus: HibernationStatus;
  lifeStage: string;
  lastCareAt: string | null;
  lastFedAt: string | null;
  lastInteractedAt: string | null;
  lastStateSyncAt: string;
}

const toLifeSnapshot = (frog: FrogWithLife): LifeSnapshot => ({
  hunger: frog.petState?.hunger ?? frog.hunger,
  happiness: frog.petState?.happiness ?? frog.happiness,
  cleanliness: frog.petState?.cleanliness ?? frog.cleanliness,
  health: frog.petState?.health ?? frog.health,
  energy: frog.petState?.energy ?? frog.energy,
  isSick: frog.petState?.isSick ?? frog.isSick,
  isDormant: frog.petState?.isDormant ?? frog.hibernationStatus === 'SLEEPING',
  needsClean: frog.needsClean,
  hibernationStatus: frog.hibernationStatus,
  frogStatus: frog.status,
  lastStateSyncAt: frog.petState?.lastStateSyncAt ?? frog.lastStatusUpdate,
  lastInteractedAt: frog.lastInteractedAt,
});

const toLifeReadModel = (frog: FrogWithLife): LifeReadModel => {
  const snapshot = toLifeSnapshot(frog);
  const computed = applyLifeDecay(snapshot);

  return {
    frogId: frog.id,
    tokenId: frog.tokenId,
    name: frog.name,
    walletAddress: frog.ownerAddress.toLowerCase(),
    hunger: computed.hunger,
    happiness: computed.happiness,
    cleanliness: computed.cleanliness,
    health: computed.health,
    energy: computed.energy,
    mood: computed.mood,
    isSick: computed.isSick,
    needsClean: computed.needsClean,
    isDormant: computed.isDormant,
    hibernationStatus: computed.hibernationStatus,
    lifeStage: frog.petState?.lifeStage || 'ACTIVE',
    lastCareAt: frog.petState?.lastCareAt?.toISOString() || null,
    lastFedAt: frog.lastFedAt?.toISOString() || null,
    lastInteractedAt: frog.lastInteractedAt?.toISOString() || null,
    lastStateSyncAt: snapshot.lastStateSyncAt.toISOString(),
  };
};

export class LifeQueryService {
  private ensureOwner(frog: FrogWithLife, walletAddress?: string): void {
    if (!walletAddress) {
      return;
    }

    const normalized = normalizeWalletAddress(walletAddress);
    if (frog.ownerAddress.toLowerCase() !== normalized) {
      throw new AppError(403, 'You are not the owner of this frog', 'FORBIDDEN');
    }
  }

  private async getFrogOrThrow(where: Prisma.FrogWhereUniqueInput): Promise<FrogWithLife> {
    const frog = await prisma.frog.findUnique({
      where,
      include: {
        petState: true,
      },
    });

    if (!frog) {
      throw new AppError(404, 'Frog not found', 'NOT_FOUND');
    }

    return frog;
  }

  async getLifeByFrogId(frogId: number, walletAddress?: string): Promise<LifeReadModel> {
    const frog = await this.getFrogOrThrow({ id: frogId });
    this.ensureOwner(frog, walletAddress);
    return toLifeReadModel(frog);
  }

  async getLifeByTokenId(tokenId: number, walletAddress?: string): Promise<LifeReadModel> {
    const frog = await this.getFrogOrThrow({ tokenId });
    this.ensureOwner(frog, walletAddress);
    return toLifeReadModel(frog);
  }
}

export const lifeQueryService = new LifeQueryService();
