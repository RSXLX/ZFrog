import { randomUUID } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';

export type JourneyRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type JourneyStepStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type JourneyStepSettleResult = 'COMPLETED' | 'FAILED' | 'SKIPPED';
export type JourneyStatus = 'ACTIVE' | 'SETTLED';
export type JourneyMemberRole = 'LEAD' | 'MEMBER';

export interface JourneyStepInput {
  id?: string;
  title: string;
  description?: string;
  riskLevel?: JourneyRiskLevel;
}

export interface JourneyCreateCommand {
  slug?: string;
  title: string;
  narrativeSeed?: string;
  partyMembers?: string[];
  steps?: JourneyStepInput[];
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

export interface JourneySettleStepCommand {
  journeyId: string;
  stepId: string;
  result: JourneyStepSettleResult;
  reason?: string;
  requestedBy: {
    appId: string;
    actor: string;
  };
}

export interface JourneyAdvanceStepCommand {
  journeyId: string;
  stepId: string;
  reason?: string;
  requestedBy: {
    appId: string;
    actor: string;
  };
}

export interface JourneyReadModel {
  id: string;
  slug: string;
  title: string;
  narrativeSeed: string | null;
  status: JourneyStatus;
  currentStepId: string | null;
  createdAt: string;
  updatedAt: string;
  steps: Array<{
    id: string;
    title: string;
    description: string | null;
    riskLevel: JourneyRiskLevel;
    order: number;
    status: JourneyStepStatus;
    completedAt: string | null;
    settledByActor: string | null;
    resultNote: string | null;
  }>;
  partyMembers: Array<{
    walletAddress: string;
    role: JourneyMemberRole;
    joinedAt: string;
  }>;
  audit: {
    createdByAppId: string;
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
    updatedByActor: string;
  };
}

interface JourneyState {
  id: string;
  slug: string;
  title: string;
  narrativeSeed: string | null;
  status: JourneyStatus;
  currentStepId: string | null;
  createdAt: string;
  updatedAt: string;
  steps: JourneyReadModel['steps'];
  partyMembers: JourneyReadModel['partyMembers'];
  audit: JourneyReadModel['audit'];
}

const JOURNEY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const JOURNEY_STEP_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WALLET_PATTERN = /^0x[a-f0-9]{40}$/i;

const normalizeWalletAddress = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!WALLET_PATTERN.test(normalized)) {
    throw new AppError(400, 'party member wallet address is invalid', 'INVALID_INPUT', {
      walletAddress: value,
    });
  }
  return normalized;
};

const normalizeJourneySlug = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!JOURNEY_SLUG_PATTERN.test(normalized)) {
    throw new AppError(400, 'journey slug is invalid', 'INVALID_INPUT', {
      slug: value,
    });
  }
  return normalized;
};

const slugifyJourneyTitle = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

const normalizeStepId = (value: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!JOURNEY_STEP_ID_PATTERN.test(normalized)) {
    throw new AppError(400, 'journey step id is invalid', 'INVALID_INPUT', {
      stepId: value,
    });
  }
  return normalized;
};

const cloneJourney = (journey: JourneyState): JourneyReadModel => ({
  ...journey,
  steps: journey.steps.map((step) => ({ ...step })),
  partyMembers: journey.partyMembers.map((member) => ({ ...member })),
  audit: {
    ...journey.audit,
  },
});

const buildDefaultSteps = (): JourneyStepInput[] => [
  {
    id: 'launch',
    title: 'Launch Preparation',
    description: 'Collect supplies and align party roles.',
    riskLevel: 'LOW',
  },
  {
    id: 'midpoint',
    title: 'Midpoint Challenge',
    description: 'Resolve the main obstacle before extraction.',
    riskLevel: 'MEDIUM',
  },
  {
    id: 'return-home',
    title: 'Safe Return',
    description: 'Extract and preserve mission outcomes.',
    riskLevel: 'LOW',
  },
];

class JourneyService {
  private readonly journeys = new Map<string, JourneyState>();

  createJourney(input: JourneyCreateCommand): JourneyReadModel {
    const now = new Date().toISOString();
    const id = `jrn_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const slugCandidate = input.slug?.trim() || slugifyJourneyTitle(input.title) || id;
    const slug = normalizeJourneySlug(slugCandidate);
    const title = input.title.trim();

    if (!title) {
      throw new AppError(400, 'journey title is required', 'INVALID_INPUT');
    }

    const stepSeed = input.steps && input.steps.length > 0 ? input.steps : buildDefaultSteps();
    const normalizedSteps = this.buildStepReadModels(stepSeed);
    const firstStep = normalizedSteps[0];
    if (!firstStep) {
      throw new AppError(400, 'journey must include at least one step', 'INVALID_INPUT');
    }
    firstStep.status = 'ACTIVE';

    const normalizedPartyMembers = this.buildPartyMembers(input.partyMembers);

    const journey: JourneyState = {
      id,
      slug,
      title,
      narrativeSeed: input.narrativeSeed?.trim() || null,
      status: 'ACTIVE',
      currentStepId: firstStep.id,
      createdAt: now,
      updatedAt: now,
      steps: normalizedSteps,
      partyMembers: normalizedPartyMembers,
      audit: {
        createdByAppId: input.requestedBy.appId,
        createdByKeyId: input.requestedBy.keyId,
        createdByActor: input.requestedBy.actor,
        requestId: input.requestedBy.requestId?.trim() || null,
        updatedByActor: input.requestedBy.actor,
      },
    };

    this.journeys.set(id, journey);
    return cloneJourney(journey);
  }

  getJourneyById(
    journeyId: string,
    options?: {
      scopeAppId?: string;
    }
  ): JourneyReadModel {
    const journey = this.getJourneyByIdOrThrow(journeyId, options?.scopeAppId);
    return cloneJourney(journey);
  }

  settleJourneyStep(input: JourneySettleStepCommand): JourneyReadModel {
    const journey = this.getJourneyByIdOrThrow(input.journeyId, input.requestedBy.appId);

    if (journey.status !== 'ACTIVE') {
      throw new AppError(409, 'journey is already settled', 'INVALID_STATE', {
        journeyId: input.journeyId,
        status: journey.status,
      });
    }

    if (journey.currentStepId !== input.stepId) {
      throw new AppError(409, 'journey step is not current active step', 'INVALID_STATE', {
        journeyId: input.journeyId,
        stepId: input.stepId,
        currentStepId: journey.currentStepId,
      });
    }

    const step = journey.steps.find((item) => item.id === input.stepId);
    if (!step) {
      throw new AppError(404, 'journey step not found', 'NOT_FOUND', {
        journeyId: input.journeyId,
        stepId: input.stepId,
      });
    }

    if (step.status !== 'ACTIVE') {
      throw new AppError(409, 'journey step is not active', 'INVALID_STATE', {
        journeyId: input.journeyId,
        stepId: input.stepId,
        stepStatus: step.status,
      });
    }

    const now = new Date().toISOString();
    step.status = input.result;
    step.completedAt = now;
    step.settledByActor = input.requestedBy.actor;
    step.resultNote = input.reason?.trim() || null;

    if (input.result === 'FAILED') {
      journey.status = 'SETTLED';
      journey.currentStepId = null;
    } else {
      const nextStep = journey.steps.find((item) => item.status === 'PENDING');
      if (nextStep) {
        nextStep.status = 'ACTIVE';
        journey.currentStepId = nextStep.id;
      } else {
        journey.status = 'SETTLED';
        journey.currentStepId = null;
      }
    }

    journey.updatedAt = now;
    journey.audit.updatedByActor = input.requestedBy.actor;

    return cloneJourney(journey);
  }

  advanceJourneyStep(input: JourneyAdvanceStepCommand): JourneyReadModel {
    return this.settleJourneyStep({
      journeyId: input.journeyId,
      stepId: input.stepId,
      result: 'COMPLETED',
      ...(input.reason ? { reason: input.reason } : {}),
      requestedBy: {
        appId: input.requestedBy.appId,
        actor: input.requestedBy.actor,
      },
    });
  }

  resetForTest(): void {
    this.journeys.clear();
  }

  private getJourneyByIdOrThrow(journeyId: string, scopeAppId?: string): JourneyState {
    const journey = this.journeys.get(journeyId);
    if (!journey || (scopeAppId && journey.audit.createdByAppId !== scopeAppId)) {
      throw new AppError(404, 'journey not found', 'NOT_FOUND', {
        journeyId,
      });
    }
    return journey;
  }

  private buildStepReadModels(stepSeed: JourneyStepInput[]): JourneyReadModel['steps'] {
    const usedStepIds = new Set<string>();

    return stepSeed.map((step, index) => {
      const stepTitle = step.title.trim();
      if (!stepTitle) {
        throw new AppError(400, 'journey step title is required', 'INVALID_INPUT', {
          index,
        });
      }

      const stepIdCandidate = step.id?.trim() || `step-${index + 1}`;
      const stepId = normalizeStepId(stepIdCandidate);
      if (usedStepIds.has(stepId)) {
        throw new AppError(400, 'journey step ids must be unique', 'INVALID_INPUT', {
          stepId,
        });
      }
      usedStepIds.add(stepId);

      return {
        id: stepId,
        title: stepTitle,
        description: step.description?.trim() || null,
        riskLevel: step.riskLevel || 'MEDIUM',
        order: index + 1,
        status: 'PENDING',
        completedAt: null,
        settledByActor: null,
        resultNote: null,
      };
    });
  }

  private buildPartyMembers(partyMembers: string[] | undefined): JourneyReadModel['partyMembers'] {
    const now = new Date().toISOString();
    const candidates = Array.isArray(partyMembers) ? partyMembers : [];
    const uniqueMembers = Array.from(new Set(candidates.map((item) => normalizeWalletAddress(item))));

    if (uniqueMembers.length === 0) {
      return [
        {
          walletAddress: '0x0000000000000000000000000000000000000000',
          role: 'LEAD',
          joinedAt: now,
        },
      ];
    }

    return uniqueMembers.map((walletAddress, index) => ({
      walletAddress,
      role: index === 0 ? 'LEAD' : 'MEMBER',
      joinedAt: now,
    }));
  }
}

export const v3JourneyService = new JourneyService();
export const resetV3JourneyStoreForTest = (): void => {
  v3JourneyService.resetForTest();
};
