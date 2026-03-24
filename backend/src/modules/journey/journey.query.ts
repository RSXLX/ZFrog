import { JourneyReadModel, v3JourneyService } from './journey.service';

export type JourneyRewardPreviewStatus = 'LOCKED' | 'READY_TO_CLAIM' | 'UNAVAILABLE';

export interface JourneyViewerReadModel {
  id: string;
  slug: string;
  title: string;
  narrativeSeed: string | null;
  status: JourneyReadModel['status'];
  currentStepId: string | null;
  createdAt: string;
  updatedAt: string;
  progress: {
    totalChapters: number;
    completedChapters: number;
    failedChapters: number;
    skippedChapters: number;
    pendingChapters: number;
    activeChapters: number;
    completionPercent: number;
  };
  chapters: Array<
    JourneyReadModel['steps'][number] & {
      isCurrent: boolean;
    }
  >;
  party: {
    leadWalletAddress: string | null;
    memberCount: number;
    members: JourneyReadModel['partyMembers'];
  };
  rewards: {
    status: JourneyRewardPreviewStatus;
    hint: string;
  };
  audit: JourneyReadModel['audit'];
}

const toCompletionPercent = (completed: number, total: number): number => {
  if (total <= 0) {
    return 0;
  }
  return Math.round((completed / total) * 100);
};

const toRewardPreview = (journey: JourneyReadModel): JourneyViewerReadModel['rewards'] => {
  const failedCount = journey.steps.filter((step) => step.status === 'FAILED').length;
  if (failedCount > 0) {
    return {
      status: 'UNAVAILABLE',
      hint: 'Current run failed. Restart the journey to unlock rewards.',
    };
  }

  if (journey.status === 'SETTLED') {
    return {
      status: 'READY_TO_CLAIM',
      hint: 'Journey settled. Reward distribution can be claimed in later milestones.',
    };
  }

  return {
    status: 'LOCKED',
    hint: 'Complete all required chapters to unlock reward distribution.',
  };
};

export const buildJourneyViewerReadModel = (journey: JourneyReadModel): JourneyViewerReadModel => {
  const completedChapters = journey.steps.filter((step) => step.status === 'COMPLETED').length;
  const failedChapters = journey.steps.filter((step) => step.status === 'FAILED').length;
  const skippedChapters = journey.steps.filter((step) => step.status === 'SKIPPED').length;
  const pendingChapters = journey.steps.filter((step) => step.status === 'PENDING').length;
  const activeChapters = journey.steps.filter((step) => step.status === 'ACTIVE').length;
  const lead = journey.partyMembers.find((member) => member.role === 'LEAD') || null;

  return {
    id: journey.id,
    slug: journey.slug,
    title: journey.title,
    narrativeSeed: journey.narrativeSeed,
    status: journey.status,
    currentStepId: journey.currentStepId,
    createdAt: journey.createdAt,
    updatedAt: journey.updatedAt,
    progress: {
      totalChapters: journey.steps.length,
      completedChapters,
      failedChapters,
      skippedChapters,
      pendingChapters,
      activeChapters,
      completionPercent: toCompletionPercent(completedChapters, journey.steps.length),
    },
    chapters: journey.steps.map((step) => ({
      ...step,
      isCurrent: journey.currentStepId === step.id,
    })),
    party: {
      leadWalletAddress: lead?.walletAddress || null,
      memberCount: journey.partyMembers.length,
      members: journey.partyMembers.map((member) => ({ ...member })),
    },
    rewards: toRewardPreview(journey),
    audit: {
      ...journey.audit,
    },
  };
};

export const getJourneyViewerById = (input: {
  journeyId: string;
  scopeAppId?: string;
}): JourneyViewerReadModel => {
  const journey = v3JourneyService.getJourneyById(input.journeyId, {
    scopeAppId: input.scopeAppId,
  });
  return buildJourneyViewerReadModel(journey);
};
