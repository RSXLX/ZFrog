export const V3_JOURNEY_STATUSES = ['ACTIVE', 'SETTLED'] as const;
export const V3_JOURNEY_STEP_STATUSES = [
  'PENDING',
  'ACTIVE',
  'COMPLETED',
  'FAILED',
  'SKIPPED',
] as const;
export const V3_JOURNEY_STEP_SETTLE_RESULTS = ['COMPLETED', 'FAILED', 'SKIPPED'] as const;
export const V3_JOURNEY_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const V3_JOURNEY_MEMBER_ROLES = ['LEAD', 'MEMBER'] as const;
export const V3_JOURNEY_REWARD_PREVIEW_STATUSES = [
  'LOCKED',
  'READY_TO_CLAIM',
  'UNAVAILABLE',
] as const;
export const V3_JOURNEY_WORLD_NODE_STATUSES = [
  'LOCKED',
  'AVAILABLE',
  'CLEARED',
  'FAILED',
  'SKIPPED',
] as const;
export const V3_JOURNEY_RELIC_STATUSES = ['LOCKED', 'DISCOVERED'] as const;
export const V3_JOURNEY_RELIC_RARITIES = ['COMMON', 'RARE'] as const;
export const V3_JOURNEY_MILESTONE_CANDIDATE_TYPES = [
  'JOURNEY_HIGH_RISK_NODE_CLEARED',
  'JOURNEY_WORLD_COMPLETED',
] as const;
export const V3_JOURNEY_INCIDENT_TEMPLATES = ['METEOR_RESCUE_NIGHT'] as const;
export const V3_JOURNEY_INCIDENT_STATUSES = ['TRIGGERED', 'RESOLVED', 'FALLBACK_SETTLED'] as const;
export const V3_JOURNEY_INCIDENT_DECISIONS = [
  'DEPLOY_RESCUE',
  'HOLD_FORMATION',
  'ABORT_MISSION',
] as const;
export const V3_JOURNEY_INCIDENT_OUTCOMES = [
  'RESCUED',
  'STABILIZED',
  'MISSION_ABORTED',
  'FALLBACK_REWARD_APPLIED',
] as const;
export const V3_JOURNEY_INCIDENT_MEMORY_IMPORTANCE = ['LOW', 'MEDIUM', 'HIGH'] as const;

export type V3JourneyStatus = (typeof V3_JOURNEY_STATUSES)[number];
export type V3JourneyStepStatus = (typeof V3_JOURNEY_STEP_STATUSES)[number];
export type V3JourneyStepSettleResult = (typeof V3_JOURNEY_STEP_SETTLE_RESULTS)[number];
export type V3JourneyRiskLevel = (typeof V3_JOURNEY_RISK_LEVELS)[number];
export type V3JourneyMemberRole = (typeof V3_JOURNEY_MEMBER_ROLES)[number];
export type V3JourneyRewardPreviewStatus = (typeof V3_JOURNEY_REWARD_PREVIEW_STATUSES)[number];
export type V3JourneyWorldNodeStatus = (typeof V3_JOURNEY_WORLD_NODE_STATUSES)[number];
export type V3JourneyRelicStatus = (typeof V3_JOURNEY_RELIC_STATUSES)[number];
export type V3JourneyRelicRarity = (typeof V3_JOURNEY_RELIC_RARITIES)[number];
export type V3JourneyMilestoneCandidateType =
  (typeof V3_JOURNEY_MILESTONE_CANDIDATE_TYPES)[number];
export type V3JourneyIncidentTemplate = (typeof V3_JOURNEY_INCIDENT_TEMPLATES)[number];
export type V3JourneyIncidentStatus = (typeof V3_JOURNEY_INCIDENT_STATUSES)[number];
export type V3JourneyIncidentDecision = (typeof V3_JOURNEY_INCIDENT_DECISIONS)[number];
export type V3JourneyIncidentOutcome = (typeof V3_JOURNEY_INCIDENT_OUTCOMES)[number];
export type V3JourneyIncidentMemoryImportance =
  (typeof V3_JOURNEY_INCIDENT_MEMORY_IMPORTANCE)[number];

export interface V3JourneyStepReadModel {
  id: string;
  title: string;
  description: string | null;
  riskLevel: V3JourneyRiskLevel;
  order: number;
  status: V3JourneyStepStatus;
  completedAt: string | null;
  settledByActor: string | null;
  resultNote: string | null;
}

export interface V3JourneyPartyMember {
  walletAddress: string;
  role: V3JourneyMemberRole;
  joinedAt: string;
}

export interface V3JourneyAudit {
  createdByAppId: string;
  createdByKeyId: string;
  createdByActor: string;
  requestId: string | null;
  updatedByActor: string;
}

export interface V3JourneyReadModel {
  id: string;
  slug: string;
  title: string;
  narrativeSeed: string | null;
  status: V3JourneyStatus;
  currentStepId: string | null;
  createdAt: string;
  updatedAt: string;
  steps: V3JourneyStepReadModel[];
  partyMembers: V3JourneyPartyMember[];
  audit: V3JourneyAudit;
}

export interface V3JourneyViewerProgress {
  totalChapters: number;
  completedChapters: number;
  failedChapters: number;
  skippedChapters: number;
  pendingChapters: number;
  activeChapters: number;
  completionPercent: number;
}

export interface V3JourneyViewerChapter extends V3JourneyStepReadModel {
  isCurrent: boolean;
}

export interface V3JourneyRewardPreview {
  status: V3JourneyRewardPreviewStatus;
  hint: string;
}

export interface V3JourneyViewerReadModel {
  id: string;
  slug: string;
  title: string;
  narrativeSeed: string | null;
  status: V3JourneyStatus;
  currentStepId: string | null;
  createdAt: string;
  updatedAt: string;
  progress: V3JourneyViewerProgress;
  chapters: V3JourneyViewerChapter[];
  party: {
    leadWalletAddress: string | null;
    memberCount: number;
    members: V3JourneyPartyMember[];
  };
  rewards: V3JourneyRewardPreview;
  audit: V3JourneyAudit;
}

export interface V3JourneyWorldNode {
  id: string;
  stepId: string;
  title: string;
  order: number;
  riskLevel: V3JourneyRiskLevel;
  status: V3JourneyWorldNodeStatus;
  unlockedAt: string | null;
  clearedAt: string | null;
  footprintCount: number;
}

export interface V3JourneyRelic {
  id: string;
  stepId: string;
  nodeId: string;
  name: string;
  rarity: V3JourneyRelicRarity;
  status: V3JourneyRelicStatus;
  discoveredAt: string | null;
  milestoneEligible: boolean;
}

export interface V3JourneyFootprint {
  id: string;
  stepId: string;
  actor: string;
  outcome: Exclude<V3JourneyStepStatus, 'PENDING' | 'ACTIVE'>;
  createdAt: string;
}

export interface V3JourneyMilestoneCandidate {
  type: V3JourneyMilestoneCandidateType;
  stepId: string | null;
  reason: string;
  occurredAt: string;
}

export interface V3JourneyWorldGraphReadModel {
  journeyId: string;
  generatedAt: string;
  nodes: V3JourneyWorldNode[];
  relics: V3JourneyRelic[];
  footprints: V3JourneyFootprint[];
  milestones: {
    eligible: boolean;
    candidates: V3JourneyMilestoneCandidate[];
  };
}

export interface V3JourneyIncidentPromptTrace {
  traceId: string;
  promptKitVersion: string;
  systemPromptVersion: string;
  responsePromptVersion: string;
  fingerprint: string;
  variables: Record<string, unknown>;
}

export interface V3JourneyIncidentRelationshipSignal {
  sourceWallet: string;
  targetWallet: string;
  trustDelta: number;
  reason: string;
}

export interface V3JourneyIncidentMemoryFragment {
  id: string;
  title: string;
  text: string;
  importance: V3JourneyIncidentMemoryImportance;
  tags: string[];
}

export interface V3JourneyIncidentReadModel {
  id: string;
  journeyId: string;
  stepId: string;
  template: V3JourneyIncidentTemplate;
  title: string;
  description: string;
  status: V3JourneyIncidentStatus;
  options: V3JourneyIncidentDecision[];
  promptTrace: V3JourneyIncidentPromptTrace;
  triggeredAt: string;
  resolvedAt: string | null;
  resolution: {
    decision: V3JourneyIncidentDecision | null;
    outcome: V3JourneyIncidentOutcome | null;
    note: string | null;
    respondedByActor: string | null;
  };
  effects: {
    relationshipSignals: V3JourneyIncidentRelationshipSignal[];
    memoryFragments: V3JourneyIncidentMemoryFragment[];
  };
  audit: V3JourneyAudit;
}

export interface V3JourneyIncidentListReadModel {
  journeyId: string;
  items: V3JourneyIncidentReadModel[];
}

export interface V3JourneyIncidentTriggerResult {
  incident: V3JourneyIncidentReadModel;
  journey: V3JourneyReadModel;
}

export interface V3JourneyIncidentRespondResult {
  incident: V3JourneyIncidentReadModel;
  journey: V3JourneyReadModel;
}

export interface V3JourneyStepInput {
  id?: string;
  title: string;
  description?: string;
  riskLevel?: V3JourneyRiskLevel;
}

export interface V3JourneyCreatePayload {
  slug?: string;
  title: string;
  narrativeSeed?: string;
  partyMembers?: string[];
  steps?: V3JourneyStepInput[];
}

export interface V3JourneySettleStepPayload {
  result: V3JourneyStepSettleResult;
  reason?: string;
}

export interface V3JourneyAdvanceStepPayload {
  reason?: string;
}

export interface V3JourneyIncidentTriggerPayload {
  stepId?: string;
  template?: V3JourneyIncidentTemplate;
  contextNote?: string;
}

export interface V3JourneyIncidentRespondPayload {
  decision: V3JourneyIncidentDecision;
  note?: string;
}
