import { HibernationStatus, Prisma } from '@prisma/client';
import { prisma } from '../../database';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeWalletAddress } from '../identity/nonce.service';
import { worldVerifyService } from '../identity/world-verify.service';
import {
  applyLifeDecay,
  calculateRestRecovery,
  clampLifeStat,
  LifeComputedState,
  LifeSnapshot,
  resolveHibernationStatus,
} from './state-calculator';

type Tx = Prisma.TransactionClient;

type FrogWithPetState = Prisma.FrogGetPayload<{
  include: {
    petState: true;
  };
}>;

interface FrogLookup {
  frogId?: number;
  tokenId?: number;
  walletAddress?: string;
}

interface FeedInput extends FrogLookup {
  foodType: string;
  quantity?: number;
  source?: string;
  requestId?: string;
}

interface PlayInput extends FrogLookup {
  gameType?: string;
  score?: number;
  happinessGainOverride?: number;
  source?: string;
  requestId?: string;
}

interface LifeActionInput extends FrogLookup {
  source?: string;
  requestId?: string;
}

interface BlessDormancyInput {
  blesserFrogId: number;
  targetFrogId: number;
  walletAddress?: string;
  verificationId?: string;
  requestId?: string;
}

interface LifeStateResult {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  isSick: boolean;
  needsClean: boolean;
  isDormant: boolean;
  hibernationStatus: HibernationStatus;
  mood: string;
}

const FOOD_EFFECTS: Record<string, { hunger: number; energy: number; happiness: number }> = {
  BREAD: { hunger: 15, energy: 0, happiness: 0 },
  BUG_BENTO: { hunger: 25, energy: 5, happiness: 0 },
  CAKE: { hunger: 0, energy: 0, happiness: 20 },
  FLY: { hunger: 10, energy: 0, happiness: 5 },
  WORM: { hunger: 15, energy: 0, happiness: 8 },
  CRICKET: { hunger: 25, energy: 5, happiness: 15 },
  BUTTERFLY: { hunger: 20, energy: 0, happiness: 20 },
  DRAGONFLY: { hunger: 35, energy: 10, happiness: 25 },
  GOLDEN_FLY: { hunger: 50, energy: 15, happiness: 40 },
};

const PLAY_GAIN: Record<string, number> = {
  guess: 10,
  catch_bug: 15,
  lily_pad: 20,
  memory: 15,
  pet: 5,
  talk: 3,
  play: 10,
};

const normalizeFoodType = (foodType: string): string =>
  foodType
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');

const normalizeGameType = (gameType?: string): string => (gameType || 'play').trim().toLowerCase();

const toLifeSnapshot = (frog: FrogWithPetState): LifeSnapshot => ({
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

const toLifeStateResult = (state: LifeComputedState): LifeStateResult => ({
  hunger: state.hunger,
  happiness: state.happiness,
  cleanliness: state.cleanliness,
  health: state.health,
  energy: state.energy,
  isSick: state.isSick,
  needsClean: state.needsClean,
  isDormant: state.isDormant,
  hibernationStatus: state.hibernationStatus,
  mood: state.mood,
});

export class LifeCommandService {
  private async getFrogForWrite(tx: Tx, lookup: FrogLookup): Promise<FrogWithPetState> {
    let where: Prisma.FrogWhereUniqueInput | null = null;
    if (lookup.frogId) {
      where = { id: lookup.frogId };
    } else if (lookup.tokenId) {
      where = { tokenId: lookup.tokenId };
    }

    if (!where) {
      throw new AppError(400, 'frogId or tokenId is required', 'INVALID_INPUT');
    }

    const frog = await tx.frog.findUnique({
      where,
      include: {
        petState: true,
      },
    });

    if (!frog) {
      throw new AppError(404, 'Frog not found', 'NOT_FOUND');
    }

    if (lookup.walletAddress) {
      const normalized = normalizeWalletAddress(lookup.walletAddress);
      if (frog.ownerAddress.toLowerCase() !== normalized) {
        throw new AppError(403, 'You are not the owner of this frog', 'FORBIDDEN');
      }
    }

    return frog;
  }

  private resolvePlayGain(gameType: string, score?: number): number {
    const base = PLAY_GAIN[gameType] ?? 10;
    if (typeof score !== 'number' || score <= 0) {
      return base;
    }
    const bonus = Math.min(10, Math.floor(score / 100));
    return base + bonus;
  }

  private async writeDomainEvent(
    tx: Tx,
    frogId: number,
    eventType: string,
    payload: Prisma.InputJsonValue,
    requestId: string | undefined,
    source: string
  ): Promise<void> {
    await tx.domainEvent.create({
      data: {
        frogId,
        aggregateType: 'Life',
        aggregateId: String(frogId),
        eventType,
        payload,
        requestId,
        source,
      },
    });
  }

  private async persistState(
    tx: Tx,
    frog: FrogWithPetState,
    state: LifeComputedState,
    options: {
      now: Date;
      lifeStage?: string;
      lastCareAt?: Date | null;
      lastInteractedAt?: Date | null;
      lastFedAt?: Date | null;
      isResting?: boolean;
      restingSince?: Date | null;
      sickSince?: Date | null;
      hibernationStatus?: HibernationStatus;
      hibernatedAt?: Date | null;
    }
  ): Promise<void> {
    const lifeStage = options.lifeStage || frog.petState?.lifeStage || (state.isDormant ? 'DORMANT' : 'ACTIVE');
    const hibernationStatus = options.hibernationStatus || state.hibernationStatus;

    await tx.petState.upsert({
      where: {
        frogId: frog.id,
      },
      update: {
        lifeStage,
        hunger: state.hunger,
        happiness: state.happiness,
        health: state.health,
        energy: state.energy,
        cleanliness: state.cleanliness,
        isSick: state.isSick,
        isDormant: state.isDormant,
        lastCareAt: options.lastCareAt === undefined ? frog.petState?.lastCareAt || null : options.lastCareAt,
        lastStateSyncAt: options.now,
      },
      create: {
        frogId: frog.id,
        lifeStage,
        hunger: state.hunger,
        happiness: state.happiness,
        health: state.health,
        energy: state.energy,
        cleanliness: state.cleanliness,
        isSick: state.isSick,
        isDormant: state.isDormant,
        lastCareAt: options.lastCareAt || null,
        lastStateSyncAt: options.now,
        metadata: {
          source: 'life.command',
        },
      },
    });

    await tx.frog.update({
      where: {
        id: frog.id,
      },
      data: {
        hunger: state.hunger,
        happiness: state.happiness,
        health: state.health,
        energy: state.energy,
        cleanliness: state.cleanliness,
        isSick: state.isSick,
        needsClean: state.needsClean,
        hibernationStatus,
        hibernatedAt:
          options.hibernatedAt === undefined
            ? hibernationStatus === 'SLEEPING'
              ? frog.hibernatedAt || options.now
              : null
            : options.hibernatedAt,
        lastStatusUpdate: options.now,
        ...(options.lastInteractedAt !== undefined ? { lastInteractedAt: options.lastInteractedAt } : {}),
        ...(options.lastFedAt !== undefined ? { lastFedAt: options.lastFedAt } : {}),
        ...(options.isResting !== undefined ? { isResting: options.isResting } : {}),
        ...(options.restingSince !== undefined ? { restingSince: options.restingSince } : {}),
        ...(options.sickSince !== undefined ? { sickSince: options.sickSince } : {}),
      },
    });
  }

  async syncLifeState(input: FrogLookup): Promise<LifeStateResult> {
    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      const computed = applyLifeDecay(toLifeSnapshot(frog));
      await this.persistState(tx, frog, computed, {
        now: new Date(),
      });
      return toLifeStateResult(computed);
    });
  }

  async feed(input: FeedInput): Promise<
    LifeStateResult & {
      foodType: string;
      quantity: number;
      foodEffects: {
        hunger: number;
        energy: number;
        happiness: number;
      };
    }
  > {
    const normalizedFoodType = normalizeFoodType(input.foodType || '');
    const foodEffects = FOOD_EFFECTS[normalizedFoodType];
    if (!foodEffects) {
      throw new AppError(400, 'Invalid food type', 'INVALID_INPUT');
    }

    const quantity = Number(input.quantity || 1);
    if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
      throw new AppError(400, 'quantity must be a positive integer', 'INVALID_INPUT');
    }

    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      const now = new Date();
      const computed = applyLifeDecay(toLifeSnapshot(frog), now);

      const nextState: LifeComputedState = {
        ...computed,
        hunger: clampLifeStat(computed.hunger + foodEffects.hunger * quantity),
        energy: clampLifeStat(computed.energy + foodEffects.energy * quantity),
        happiness: clampLifeStat(computed.happiness + foodEffects.happiness * quantity),
        isDormant: false,
        hibernationStatus: 'ACTIVE',
      };

      await this.persistState(tx, frog, nextState, {
        now,
        lastCareAt: now,
        lastInteractedAt: now,
        lastFedAt: now,
        hibernationStatus: 'ACTIVE',
      });

      await this.writeDomainEvent(
        tx,
        frog.id,
        'PetStateUpdated',
        {
          action: 'feed',
          foodType: normalizedFoodType,
          quantity,
          source: input.source || 'unknown',
        },
        input.requestId,
        'life.command.feed'
      );

      if (nextState.needsClean) {
        await this.writeDomainEvent(
          tx,
          frog.id,
          'PetNeedsCare',
          {
            reason: 'cleanliness_low',
            cleanliness: nextState.cleanliness,
          },
          input.requestId,
          'life.command.feed'
        );
      }

      return {
        ...toLifeStateResult(nextState),
        foodType: normalizedFoodType,
        quantity,
        foodEffects,
      };
    });
  }

  async clean(input: LifeActionInput): Promise<LifeStateResult> {
    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      const now = new Date();
      const computed = applyLifeDecay(toLifeSnapshot(frog), now);

      const nextState: LifeComputedState = {
        ...computed,
        cleanliness: 100,
        needsClean: false,
        isDormant: false,
        hibernationStatus: 'ACTIVE',
      };

      await this.persistState(tx, frog, nextState, {
        now,
        lastCareAt: now,
        lastInteractedAt: now,
        hibernationStatus: 'ACTIVE',
      });

      await this.writeDomainEvent(
        tx,
        frog.id,
        'PetStateUpdated',
        {
          action: 'clean',
          source: input.source || 'unknown',
        },
        input.requestId,
        'life.command.clean'
      );

      return toLifeStateResult(nextState);
    });
  }

  async play(input: PlayInput): Promise<
    LifeStateResult & {
      gameType: string;
      happinessGain: number;
    }
  > {
    const gameType = normalizeGameType(input.gameType);

    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      const now = new Date();
      const computed = applyLifeDecay(toLifeSnapshot(frog), now);

      const happinessGain =
        typeof input.happinessGainOverride === 'number'
          ? Math.max(0, Math.floor(input.happinessGainOverride))
          : this.resolvePlayGain(gameType, input.score);

      const nextState: LifeComputedState = {
        ...computed,
        happiness: clampLifeStat(computed.happiness + happinessGain),
        energy: clampLifeStat(computed.energy - 3),
        isDormant: false,
        hibernationStatus: 'ACTIVE',
      };

      await this.persistState(tx, frog, nextState, {
        now,
        lastCareAt: now,
        lastInteractedAt: now,
        hibernationStatus: 'ACTIVE',
      });

      await this.writeDomainEvent(
        tx,
        frog.id,
        'PetStateUpdated',
        {
          action: 'play',
          gameType,
          score: input.score ?? null,
          happinessGain,
          source: input.source || 'unknown',
        },
        input.requestId,
        'life.command.play'
      );

      return {
        ...toLifeStateResult(nextState),
        gameType,
        happinessGain,
      };
    });
  }

  async heal(input: LifeActionInput): Promise<LifeStateResult> {
    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      const now = new Date();
      const computed = applyLifeDecay(toLifeSnapshot(frog), now);

      const nextState: LifeComputedState = {
        ...computed,
        health: clampLifeStat(computed.health + 50),
        isSick: false,
      };

      await this.persistState(tx, frog, nextState, {
        now,
        lastCareAt: now,
        lastInteractedAt: now,
        sickSince: null,
      });

      await this.writeDomainEvent(
        tx,
        frog.id,
        'PetStateUpdated',
        {
          action: 'heal',
          source: input.source || 'unknown',
        },
        input.requestId,
        'life.command.heal'
      );

      return toLifeStateResult(nextState);
    });
  }

  async startRest(input: LifeActionInput): Promise<{ started: boolean; message: string }> {
    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      if (frog.isResting) {
        throw new AppError(400, 'Frog is already resting', 'INVALID_STATE');
      }

      const now = new Date();
      const computed = applyLifeDecay(toLifeSnapshot(frog), now);
      if (computed.energy >= 100) {
        throw new AppError(400, 'Energy is full, no need to rest', 'INVALID_STATE');
      }

      await this.persistState(tx, frog, computed, {
        now,
        lastInteractedAt: now,
        isResting: true,
        restingSince: now,
      });

      await this.writeDomainEvent(
        tx,
        frog.id,
        'PetStateUpdated',
        {
          action: 'rest_start',
          source: input.source || 'unknown',
        },
        input.requestId,
        'life.command.rest.start'
      );

      return {
        started: true,
        message: 'Frog started resting',
      };
    });
  }

  async endRest(
    input: LifeActionInput
  ): Promise<{ ended: boolean; energyGain: number; state: LifeStateResult; message: string }> {
    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      if (!frog.isResting) {
        throw new AppError(400, 'Frog is not resting', 'INVALID_STATE');
      }

      const now = new Date();
      const computed = applyLifeDecay(toLifeSnapshot(frog), now);
      const energyGain = calculateRestRecovery(frog.restingSince, now);

      const nextState: LifeComputedState = {
        ...computed,
        energy: clampLifeStat(computed.energy + energyGain),
      };

      await this.persistState(tx, frog, nextState, {
        now,
        lastInteractedAt: now,
        isResting: false,
        restingSince: null,
      });

      await this.writeDomainEvent(
        tx,
        frog.id,
        'PetStateUpdated',
        {
          action: 'rest_end',
          energyGain,
          source: input.source || 'unknown',
        },
        input.requestId,
        'life.command.rest.end'
      );

      return {
        ended: true,
        energyGain,
        state: toLifeStateResult(nextState),
        message: `Frog restored +${energyGain} energy`,
      };
    });
  }

  async syncDormancyStatus(input: FrogLookup): Promise<{ hibernationStatus: HibernationStatus; changed: boolean }> {
    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      const now = new Date();
      const targetStatus = resolveHibernationStatus(frog.lastInteractedAt, frog.hibernationStatus, now);
      const changed = targetStatus !== frog.hibernationStatus;

      if (!changed) {
        return {
          hibernationStatus: targetStatus,
          changed: false,
        };
      }

      const computed = applyLifeDecay(toLifeSnapshot(frog), now);
      const nextState: LifeComputedState = {
        ...computed,
        isDormant: targetStatus === 'SLEEPING',
        hibernationStatus: targetStatus,
      };

      await this.persistState(tx, frog, nextState, {
        now,
        hibernationStatus: targetStatus,
        hibernatedAt: targetStatus === 'SLEEPING' ? now : null,
      });

      if (targetStatus === 'SLEEPING') {
        await this.writeDomainEvent(
          tx,
          frog.id,
          'PetEnteredDormancy',
          {
            from: frog.hibernationStatus,
            to: targetStatus,
          },
          undefined,
          'life.command.dormancy'
        );
      }

      return {
        hibernationStatus: targetStatus,
        changed: true,
      };
    });
  }

  async reviveDormant(input: LifeActionInput): Promise<
    LifeStateResult & {
      revived: boolean;
      cost: number;
    }
  > {
    return prisma.$transaction(async (tx) => {
      const frog = await this.getFrogForWrite(tx, input);
      const now = new Date();
      const currentStatus = resolveHibernationStatus(frog.lastInteractedAt, frog.hibernationStatus, now);
      if (currentStatus !== 'SLEEPING') {
        throw new AppError(409, 'Frog is not sleeping', 'INVALID_STATE');
      }

      const computed = applyLifeDecay(toLifeSnapshot(frog), now);
      const nextState: LifeComputedState = {
        ...computed,
        hunger: clampLifeStat(Math.max(computed.hunger, 50)),
        happiness: clampLifeStat(Math.max(computed.happiness, 50)),
        energy: clampLifeStat(Math.max(computed.energy, 50)),
        health: clampLifeStat(Math.max(computed.health, 60)),
        isSick: false,
        isDormant: false,
        hibernationStatus: 'ACTIVE',
      };

      await this.persistState(tx, frog, nextState, {
        now,
        lastInteractedAt: now,
        hibernationStatus: 'ACTIVE',
        hibernatedAt: null,
        sickSince: null,
      });

      await tx.frog.update({
        where: {
          id: frog.id,
        },
        data: {
          blessingsReceived: 0,
        },
      });

      await this.writeDomainEvent(
        tx,
        frog.id,
        'PetStateUpdated',
        {
          action: 'revive',
          source: input.source || 'unknown',
        },
        input.requestId,
        'life.command.revive'
      );

      return {
        ...toLifeStateResult(nextState),
        revived: true,
        cost: 0,
      };
    });
  }

  async blessDormant(input: BlessDormancyInput): Promise<{
    success: boolean;
    message: string;
    blessingsReceived: number;
    blesserEnergy: number;
  }> {
    if (!input.blesserFrogId || !input.targetFrogId || input.blesserFrogId === input.targetFrogId) {
      throw new AppError(400, 'Invalid blesserFrogId or targetFrogId', 'INVALID_INPUT');
    }

    if (input.verificationId && input.walletAddress) {
      await worldVerifyService.requireVerification(input.verificationId, input.walletAddress);
    }

    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const blesser = await this.getFrogForWrite(tx, {
        frogId: input.blesserFrogId,
        walletAddress: input.walletAddress,
      });
      const target = await this.getFrogForWrite(tx, {
        frogId: input.targetFrogId,
      });

      const targetStatus = resolveHibernationStatus(target.lastInteractedAt, target.hibernationStatus, now);
      if (targetStatus !== 'SLEEPING') {
        throw new AppError(409, 'Target frog is not sleeping', 'INVALID_STATE');
      }

      const friendship = await tx.friendship.findFirst({
        where: {
          status: 'Accepted',
          OR: [
            { requesterId: blesser.id, addresseeId: target.id },
            { requesterId: target.id, addresseeId: blesser.id },
          ],
        },
        select: {
          id: true,
        },
      });

      if (!friendship) {
        throw new AppError(403, 'Must be friends to bless', 'FORBIDDEN');
      }

      const blesserState = applyLifeDecay(toLifeSnapshot(blesser), now);
      if (blesserState.isDormant || blesserState.hibernationStatus !== 'ACTIVE') {
        throw new AppError(409, 'Only active frogs can bless', 'INVALID_STATE');
      }
      if (blesserState.energy < 10) {
        throw new AppError(409, 'Insufficient energy (need 10)', 'ENERGY_LOW');
      }

      const nextBlesserState: LifeComputedState = {
        ...blesserState,
        energy: clampLifeStat(blesserState.energy - 10),
      };

      await this.persistState(tx, blesser, nextBlesserState, {
        now,
        lastCareAt: now,
        lastInteractedAt: now,
        hibernationStatus: 'ACTIVE',
      });

      const nextBlessings = target.blessingsReceived + 1;
      await tx.frog.update({
        where: {
          id: target.id,
        },
        data: {
          blessingsReceived: nextBlessings,
          hibernationStatus: 'SLEEPING',
          hibernatedAt: target.hibernatedAt || now,
        },
      });

      await tx.petState.upsert({
        where: {
          frogId: target.id,
        },
        update: {
          isDormant: true,
          lifeStage: 'DORMANT',
        },
        create: {
          frogId: target.id,
          lifeStage: 'DORMANT',
          hunger: target.hunger,
          happiness: target.happiness,
          health: target.health,
          energy: target.energy,
          cleanliness: target.cleanliness,
          isSick: target.isSick,
          isDormant: true,
          lastStateSyncAt: now,
          metadata: {
            source: 'life.command.bless',
          },
        },
      });

      await tx.ritual.create({
        data: {
          frogId: blesser.id,
          targetFrogId: target.id,
          ritualType: 'HIBERNATION_BLESSING',
          status: 'COMPLETED',
          payload: {
            verificationId: input.verificationId || null,
          },
          startedAt: now,
          completedAt: now,
        },
      });

      await tx.relationshipEvent.create({
        data: {
          frogId: target.id,
          actorFrogId: blesser.id,
          counterpartyFrogId: target.id,
          eventType: 'BLESSING',
          payload: {
            blessingsReceived: nextBlessings,
          },
        },
      });

      await this.writeDomainEvent(
        tx,
        target.id,
        'BlessingStarted',
        {
          blesserFrogId: blesser.id,
          targetFrogId: target.id,
          verificationId: input.verificationId || null,
        },
        input.requestId,
        'life.command.bless'
      );

      await this.writeDomainEvent(
        tx,
        target.id,
        'BlessingCompleted',
        {
          blesserFrogId: blesser.id,
          targetFrogId: target.id,
          blessingsReceived: nextBlessings,
        },
        input.requestId,
        'life.command.bless'
      );

      return {
        success: true,
        message: `成功为 ${target.name} 祈福`,
        blessingsReceived: nextBlessings,
        blesserEnergy: nextBlesserState.energy,
      };
    });
  }
}

export const lifeCommandService = new LifeCommandService();
