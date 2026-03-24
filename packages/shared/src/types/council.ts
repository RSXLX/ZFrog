export const V3_COUNCIL_SUGGESTION_STATUSES = [
  'OPEN',
  'ACCEPTED',
  'REJECTED',
  'DEFERRED',
] as const;

export const V3_COUNCIL_SUGGESTION_DECISIONS = ['ACCEPT', 'REJECT', 'DEFER'] as const;
export const V3_COUNCIL_SUGGESTION_RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const V3_COUNCIL_BRIEF_CHANNELS = ['desktop', 'mobile_lite'] as const;
export const V3_COUNCIL_BRIEF_DELIVERY_STATUSES = ['DELIVERED', 'THROTTLED', 'DISABLED'] as const;

export type V3CouncilSuggestionStatus = (typeof V3_COUNCIL_SUGGESTION_STATUSES)[number];
export type V3CouncilSuggestionDecision = (typeof V3_COUNCIL_SUGGESTION_DECISIONS)[number];
export type V3CouncilSuggestionRiskLevel = (typeof V3_COUNCIL_SUGGESTION_RISK_LEVELS)[number];
export type V3CouncilBriefChannel = (typeof V3_COUNCIL_BRIEF_CHANNELS)[number];
export type V3CouncilBriefDeliveryStatus = (typeof V3_COUNCIL_BRIEF_DELIVERY_STATUSES)[number];

export interface V3CouncilSuggestionDataSource {
  source: string;
  referenceId: string | null;
  freshness: string | null;
}

export interface V3CouncilSuggestionAction {
  id: string;
  label: string;
  detail: string;
}

export interface V3CouncilSuggestionReadModel {
  id: string;
  runId: string;
  title: string;
  focus: string;
  objective: string | null;
  rationale: string;
  risk: {
    level: V3CouncilSuggestionRiskLevel;
    reason: string;
  };
  dataSources: V3CouncilSuggestionDataSource[];
  suggestedActions: V3CouncilSuggestionAction[];
  status: V3CouncilSuggestionStatus;
  trace: {
    traceId: string;
    promptKitVersion: string;
    model: string;
    fingerprint: string;
  };
  createdAt: string;
  updatedAt: string;
  response: {
    decision: V3CouncilSuggestionDecision | null;
    note: string | null;
    respondedAt: string | null;
    respondedByActor: string | null;
  };
  audit: {
    createdByAppId: string;
    createdByKeyId: string;
    createdByActor: string;
    requestId: string | null;
    updatedByActor: string;
  };
}

export interface V3CouncilSuggestionListReadModel {
  total: number;
  items: V3CouncilSuggestionReadModel[];
}

export interface V3CouncilCreateSuggestionPayload {
  title?: string;
  focus: string;
  objective?: string;
  rationale?: string;
  riskLevel?: V3CouncilSuggestionRiskLevel;
  dataSources?: Array<{
    source: string;
    referenceId?: string;
    freshness?: string;
  }>;
  suggestedActions?: Array<{
    label: string;
    detail?: string;
  }>;
}

export interface V3CouncilRespondSuggestionPayload {
  decision: V3CouncilSuggestionDecision;
  note?: string;
}

export interface V3CouncilBriefHighlight {
  suggestionId: string;
  title: string;
  focus: string;
  status: V3CouncilSuggestionStatus;
  riskLevel: V3CouncilSuggestionRiskLevel;
  decision: V3CouncilSuggestionDecision | null;
  updatedAt: string;
}

export interface V3CouncilBriefPreferencesReadModel {
  enabled: boolean;
  throttleMs: number;
  channels: {
    desktop: boolean;
    mobileLite: boolean;
  };
  updatedAt: string;
  updatedByActor: string;
  requestId: string | null;
}

export interface V3CouncilBriefReadModel {
  id: string;
  generatedAt: string;
  window: {
    startAt: string;
    endAt: string;
  };
  summary: string;
  metrics: {
    total: number;
    open: number;
    accepted: number;
    rejected: number;
    deferred: number;
    resolved: number;
  };
  highlights: V3CouncilBriefHighlight[];
  delivery: {
    channel: V3CouncilBriefChannel;
    status: V3CouncilBriefDeliveryStatus;
    shouldNotify: boolean;
    notificationsEnabled: boolean;
    throttleMs: number;
    lastDeliveredAt: string | null;
    nextAllowedAt: string | null;
  };
}

export interface V3CouncilUpdateBriefPreferencesPayload {
  enabled?: boolean;
  throttleMs?: number;
  channels?: {
    desktop?: boolean;
    mobileLite?: boolean;
  };
}
