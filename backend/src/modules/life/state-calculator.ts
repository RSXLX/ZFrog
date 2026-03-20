import { HibernationStatus } from '@prisma/client';

export interface LifeSnapshot {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  isSick: boolean;
  isDormant: boolean;
  needsClean?: boolean;
  hibernationStatus?: HibernationStatus | null;
  frogStatus?: string | null;
  lastStateSyncAt: Date;
  lastInteractedAt: Date | null;
}

export interface LifeComputedState {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  isSick: boolean;
  isDormant: boolean;
  needsClean: boolean;
  mood: string;
  hibernationStatus: HibernationStatus;
  lastStateSyncAt: Date;
}

const DECAY_CONFIG = {
  hungerPerHour: 5,
  happinessPerHour: 3,
  energyPerHour: 2,
  healthPerHour: 8,
  travelDecayMultiplier: 0.5,
  drowsyHours: 72,
  sleepingHours: 96,
};

export const clampLifeStat = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

export const resolveHibernationStatus = (
  lastInteractedAt: Date | null,
  currentStatus: HibernationStatus = 'ACTIVE',
  now: Date = new Date()
): HibernationStatus => {
  if (!lastInteractedAt) {
    return currentStatus;
  }

  const inactiveHours = (now.getTime() - lastInteractedAt.getTime()) / (1000 * 60 * 60);
  if (inactiveHours >= DECAY_CONFIG.sleepingHours) {
    return 'SLEEPING';
  }
  if (inactiveHours >= DECAY_CONFIG.drowsyHours) {
    return 'DROWSY';
  }
  return 'ACTIVE';
};

export const deriveMood = (state: {
  hunger: number;
  happiness: number;
  cleanliness: number;
  health: number;
  energy: number;
  isSick: boolean;
  hibernationStatus: HibernationStatus;
}): string => {
  if (state.hibernationStatus === 'SLEEPING') return 'dormant';
  if (state.hibernationStatus === 'DROWSY') return 'drowsy';
  if (state.isSick) return 'sick';
  if (state.health < 25) return 'weak';
  if (state.hunger < 20) return 'hungry';
  if (state.cleanliness < 30) return 'dirty';
  if (state.energy < 20) return 'tired';
  if (state.happiness < 30) return 'lonely';
  if (state.hunger >= 60 && state.happiness >= 70 && state.health >= 70 && state.energy >= 60) {
    return 'happy';
  }
  return 'calm';
};

export const applyLifeDecay = (
  snapshot: LifeSnapshot,
  now: Date = new Date()
): LifeComputedState => {
  const hoursPassed = Math.max(0, (now.getTime() - snapshot.lastStateSyncAt.getTime()) / (1000 * 60 * 60));
  const isTraveling = snapshot.frogStatus === 'Traveling' || snapshot.frogStatus === 'CrossChainLocked';
  const decayMultiplier = isTraveling ? DECAY_CONFIG.travelDecayMultiplier : 1;

  const hunger = clampLifeStat(snapshot.hunger - DECAY_CONFIG.hungerPerHour * hoursPassed * decayMultiplier);
  const happiness = clampLifeStat(snapshot.happiness - DECAY_CONFIG.happinessPerHour * hoursPassed * decayMultiplier);
  const energy = clampLifeStat(snapshot.energy - DECAY_CONFIG.energyPerHour * hoursPassed * decayMultiplier);
  const cleanliness = clampLifeStat(snapshot.cleanliness);

  let health = snapshot.health;
  if (hunger < 20 || cleanliness < 30) {
    health = clampLifeStat(snapshot.health - DECAY_CONFIG.healthPerHour * hoursPassed * decayMultiplier);
  }
  health = clampLifeStat(health);

  const hibernationStatus = resolveHibernationStatus(
    snapshot.lastInteractedAt,
    snapshot.hibernationStatus || 'ACTIVE',
    now
  );
  const isDormant = snapshot.isDormant || hibernationStatus === 'SLEEPING';
  const needsClean = Boolean(snapshot.needsClean) || cleanliness < 30;

  const mood = deriveMood({
    hunger,
    happiness,
    cleanliness,
    health,
    energy,
    isSick: snapshot.isSick,
    hibernationStatus,
  });

  return {
    hunger,
    happiness,
    cleanliness,
    health,
    energy,
    isSick: snapshot.isSick,
    isDormant,
    needsClean,
    mood,
    hibernationStatus,
    lastStateSyncAt: now,
  };
};

export const calculateRestRecovery = (restingSince: Date | null, now: Date = new Date()): number => {
  if (!restingSince) {
    return 20;
  }
  const restHours = Math.max(0, (now.getTime() - restingSince.getTime()) / (1000 * 60 * 60));
  const recovery = 20 + Math.floor(restHours * 10);
  return Math.max(10, Math.min(50, recovery));
};
