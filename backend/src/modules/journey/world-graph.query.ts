import {
  type JourneyReadModel,
  type JourneyRiskLevel,
  type JourneyStepStatus,
  v3JourneyService,
} from './journey.service';

export type JourneyWorldNodeStatus = 'LOCKED' | 'AVAILABLE' | 'CLEARED' | 'FAILED' | 'SKIPPED';
export type JourneyRelicStatus = 'LOCKED' | 'DISCOVERED';
export type JourneyRelicRarity = 'COMMON' | 'RARE';
export type JourneyMilestoneCandidateType =
  | 'JOURNEY_HIGH_RISK_NODE_CLEARED'
  | 'JOURNEY_WORLD_COMPLETED';

export interface JourneyWorldGraphReadModel {
  journeyId: string;
  generatedAt: string;
  nodes: Array<{
    id: string;
    stepId: string;
    title: string;
    order: number;
    riskLevel: JourneyRiskLevel;
    status: JourneyWorldNodeStatus;
    unlockedAt: string | null;
    clearedAt: string | null;
    footprintCount: number;
  }>;
  relics: Array<{
    id: string;
    stepId: string;
    nodeId: string;
    name: string;
    rarity: JourneyRelicRarity;
    status: JourneyRelicStatus;
    discoveredAt: string | null;
    milestoneEligible: boolean;
  }>;
  footprints: Array<{
    id: string;
    stepId: string;
    actor: string;
    outcome: Exclude<JourneyStepStatus, 'PENDING' | 'ACTIVE'>;
    createdAt: string;
  }>;
  milestones: {
    eligible: boolean;
    candidates: Array<{
      type: JourneyMilestoneCandidateType;
      stepId: string | null;
      reason: string;
      occurredAt: string;
    }>;
  };
}

const STEP_STATUS_TO_NODE_STATUS: Record<JourneyStepStatus, JourneyWorldNodeStatus> = {
  PENDING: 'LOCKED',
  ACTIVE: 'AVAILABLE',
  COMPLETED: 'CLEARED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
};

const toRelicRarity = (riskLevel: JourneyRiskLevel): JourneyRelicRarity =>
  riskLevel === 'HIGH' ? 'RARE' : 'COMMON';

const buildMilestoneCandidates = (
  journey: JourneyReadModel
): JourneyWorldGraphReadModel['milestones']['candidates'] => {
  const candidates: JourneyWorldGraphReadModel['milestones']['candidates'] = [];

  for (const step of journey.steps) {
    if (step.status === 'COMPLETED' && step.riskLevel === 'HIGH' && step.completedAt) {
      candidates.push({
        type: 'JOURNEY_HIGH_RISK_NODE_CLEARED',
        stepId: step.id,
        reason: `High-risk node "${step.title}" completed.`,
        occurredAt: step.completedAt,
      });
    }
  }

  const hasFailedStep = journey.steps.some((step) => step.status === 'FAILED');
  if (journey.status === 'SETTLED' && !hasFailedStep) {
    candidates.push({
      type: 'JOURNEY_WORLD_COMPLETED',
      stepId: null,
      reason: 'All journey chapters settled without failure.',
      occurredAt: journey.updatedAt,
    });
  }

  return candidates;
};

export const buildJourneyWorldGraphReadModel = (
  journey: JourneyReadModel
): JourneyWorldGraphReadModel => {
  const footprints: JourneyWorldGraphReadModel['footprints'] = journey.steps
    .filter(
      (
        step
      ): step is JourneyReadModel['steps'][number] & {
        status: Exclude<JourneyStepStatus, 'PENDING' | 'ACTIVE'>;
      } =>
        step.status !== 'PENDING' &&
        step.status !== 'ACTIVE' &&
        Boolean(step.completedAt) &&
        Boolean(step.settledByActor)
    )
    .map((step) => ({
      id: `fp_${journey.id}_${step.id}`,
      stepId: step.id,
      actor: step.settledByActor as string,
      outcome: step.status,
      createdAt: step.completedAt as string,
    }));

  const footprintCountByStep = new Map<string, number>();
  for (const footprint of footprints) {
    footprintCountByStep.set(
      footprint.stepId,
      (footprintCountByStep.get(footprint.stepId) || 0) + 1
    );
  }

  const nodes: JourneyWorldGraphReadModel['nodes'] = journey.steps.map((step) => ({
    id: `node_${journey.id}_${step.id}`,
    stepId: step.id,
    title: step.title,
    order: step.order,
    riskLevel: step.riskLevel,
    status: STEP_STATUS_TO_NODE_STATUS[step.status],
    unlockedAt:
      step.status === 'PENDING' ? null : step.completedAt || journey.updatedAt,
    clearedAt: step.status === 'COMPLETED' ? step.completedAt : null,
    footprintCount: footprintCountByStep.get(step.id) || 0,
  }));

  const relics: JourneyWorldGraphReadModel['relics'] = journey.steps.map((step) => ({
    id: `relic_${journey.id}_${step.id}`,
    stepId: step.id,
    nodeId: `node_${journey.id}_${step.id}`,
    name: `${step.title} Relic`,
    rarity: toRelicRarity(step.riskLevel),
    status: step.status === 'COMPLETED' ? 'DISCOVERED' : 'LOCKED',
    discoveredAt: step.status === 'COMPLETED' ? step.completedAt : null,
    milestoneEligible: step.status === 'COMPLETED' && step.riskLevel === 'HIGH',
  }));

  const milestones = buildMilestoneCandidates(journey);

  return {
    journeyId: journey.id,
    generatedAt: new Date().toISOString(),
    nodes,
    relics,
    footprints,
    milestones: {
      eligible: milestones.length > 0,
      candidates: milestones,
    },
  };
};

export const getJourneyWorldGraphById = (input: {
  journeyId: string;
  scopeAppId?: string;
}): JourneyWorldGraphReadModel => {
  const journey = v3JourneyService.getJourneyById(input.journeyId, {
    scopeAppId: input.scopeAppId,
  });
  return buildJourneyWorldGraphReadModel(journey);
};

