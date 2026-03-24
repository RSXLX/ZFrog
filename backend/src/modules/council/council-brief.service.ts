import { createHash } from 'crypto';
import { AppError } from '../../middlewares/errorHandler';
import {
  COUNCIL_SUGGESTION_STATUSES,
  type CouncilSuggestionStatus,
  v3CouncilSuggestionService,
} from './council-suggestion.service';

export const COUNCIL_BRIEF_CHANNELS = ['desktop', 'mobile_lite'] as const;
export const COUNCIL_BRIEF_DELIVERY_STATUSES = ['DELIVERED', 'THROTTLED', 'DISABLED'] as const;

export type CouncilBriefChannel = (typeof COUNCIL_BRIEF_CHANNELS)[number];
export type CouncilBriefDeliveryStatus = (typeof COUNCIL_BRIEF_DELIVERY_STATUSES)[number];

const COUNCIL_BRIEF_CHANNEL_SET = new Set<string>(COUNCIL_BRIEF_CHANNELS);

const DEFAULT_THROTTLE_MS = 15 * 60 * 1000;
const MIN_THROTTLE_MS = 60 * 1000;
const MAX_THROTTLE_MS = 24 * 60 * 60 * 1000;

export interface CouncilBriefHighlight {
  suggestionId: string;
  title: string;
  focus: string;
  status: CouncilSuggestionStatus;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  decision: 'ACCEPT' | 'REJECT' | 'DEFER' | null;
  updatedAt: string;
}

export interface CouncilBriefPreferencesReadModel {
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

export interface CouncilBriefReadModel {
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
  highlights: CouncilBriefHighlight[];
  delivery: {
    channel: CouncilBriefChannel;
    status: CouncilBriefDeliveryStatus;
    shouldNotify: boolean;
    notificationsEnabled: boolean;
    throttleMs: number;
    lastDeliveredAt: string | null;
    nextAllowedAt: string | null;
  };
}

export interface UpdateCouncilBriefPreferencesCommand {
  enabled?: boolean;
  throttleMs?: number;
  channels?: {
    desktop?: boolean;
    mobileLite?: boolean;
  };
  requestedBy: {
    appId: string;
    keyId: string;
    actor: string;
    requestId?: string | null;
  };
}

interface CouncilBriefPreferenceState {
  appId: string;
  enabled: boolean;
  throttleMs: number;
  channels: {
    desktop: boolean;
    mobile_lite: boolean;
  };
  lastDeliveredAtByChannel: Partial<Record<CouncilBriefChannel, string>>;
  updatedAt: string;
  updatedByActor: string;
  requestId: string | null;
}

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (typeof raw !== 'string') {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const isCouncilBriefEnabled = (): boolean => parseBoolean(process.env.V3_COUNCIL_BRIEF_ENABLED, true);

const normalizeThrottleMs = (value: number): number => {
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    throw new AppError(400, 'throttleMs must be an integer', 'INVALID_INPUT', {
      field: 'throttleMs',
      min: MIN_THROTTLE_MS,
      max: MAX_THROTTLE_MS,
    });
  }

  if (value < MIN_THROTTLE_MS || value > MAX_THROTTLE_MS) {
    throw new AppError(400, `throttleMs must be between ${MIN_THROTTLE_MS} and ${MAX_THROTTLE_MS}`, 'INVALID_INPUT', {
      field: 'throttleMs',
      min: MIN_THROTTLE_MS,
      max: MAX_THROTTLE_MS,
      value,
    });
  }

  return value;
};

const getStatusOrZero = (
  statusCounts: Map<CouncilSuggestionStatus, number>,
  status: CouncilSuggestionStatus
): number => statusCounts.get(status) || 0;

const toIso = (value: Date): string => value.toISOString();

export class CouncilBriefService {
  private readonly preferencesByApp = new Map<string, CouncilBriefPreferenceState>();

  async getBrief(input: {
    scopeAppId: string;
    channel: CouncilBriefChannel;
  }): Promise<CouncilBriefReadModel> {
    this.assertCouncilBriefEnabled();

    const preferences = this.getOrCreatePreferences(input.scopeAppId);
    const now = new Date();
    const nowIso = toIso(now);
    const startAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [openResult, acceptedResult, rejectedResult, deferredResult, recentResult] = await Promise.all([
      v3CouncilSuggestionService.listSuggestionsForAdmin({
        scopeAppId: input.scopeAppId,
        status: 'OPEN',
        limit: 1,
      }),
      v3CouncilSuggestionService.listSuggestionsForAdmin({
        scopeAppId: input.scopeAppId,
        status: 'ACCEPTED',
        limit: 1,
      }),
      v3CouncilSuggestionService.listSuggestionsForAdmin({
        scopeAppId: input.scopeAppId,
        status: 'REJECTED',
        limit: 1,
      }),
      v3CouncilSuggestionService.listSuggestionsForAdmin({
        scopeAppId: input.scopeAppId,
        status: 'DEFERRED',
        limit: 1,
      }),
      v3CouncilSuggestionService.listSuggestionsForAdmin({
        scopeAppId: input.scopeAppId,
        limit: 10,
      }),
    ]);

    const statusCounts = new Map<CouncilSuggestionStatus, number>([
      ['OPEN', openResult.total],
      ['ACCEPTED', acceptedResult.total],
      ['REJECTED', rejectedResult.total],
      ['DEFERRED', deferredResult.total],
    ]);

    const open = getStatusOrZero(statusCounts, 'OPEN');
    const accepted = getStatusOrZero(statusCounts, 'ACCEPTED');
    const rejected = getStatusOrZero(statusCounts, 'REJECTED');
    const deferred = getStatusOrZero(statusCounts, 'DEFERRED');
    const resolved = accepted + rejected + deferred;
    const total = open + resolved;

    const highlights: CouncilBriefHighlight[] = recentResult.items.slice(0, 3).map((item) => ({
      suggestionId: item.id,
      title: item.title,
      focus: item.focus,
      status: item.status,
      riskLevel: item.risk.level,
      decision: item.response.decision,
      updatedAt: item.updatedAt,
    }));

    const summary = this.buildSummary({
      total,
      open,
      accepted,
      rejected,
      deferred,
      highlights,
    });

    const notificationsEnabled =
      preferences.enabled && (input.channel === 'desktop' ? preferences.channels.desktop : preferences.channels.mobile_lite);
    const lastDeliveredAt = preferences.lastDeliveredAtByChannel[input.channel] || null;

    let deliveryStatus: CouncilBriefDeliveryStatus = 'DELIVERED';
    let shouldNotify = true;
    let nextAllowedAt: string | null = null;

    if (!notificationsEnabled) {
      deliveryStatus = 'DISABLED';
      shouldNotify = false;
    } else if (lastDeliveredAt) {
      const elapsedMs = now.getTime() - new Date(lastDeliveredAt).getTime();
      if (Number.isFinite(elapsedMs) && elapsedMs < preferences.throttleMs) {
        deliveryStatus = 'THROTTLED';
        shouldNotify = false;
        nextAllowedAt = new Date(new Date(lastDeliveredAt).getTime() + preferences.throttleMs).toISOString();
      }
    }

    if (shouldNotify) {
      preferences.lastDeliveredAtByChannel[input.channel] = nowIso;
      preferences.updatedAt = nowIso;
      this.preferencesByApp.set(input.scopeAppId, preferences);
    }

    return {
      id: this.toBriefId({
        appId: input.scopeAppId,
        channel: input.channel,
        generatedAt: nowIso,
        statuses: statusCounts,
        highlights,
      }),
      generatedAt: nowIso,
      window: {
        startAt,
        endAt: nowIso,
      },
      summary,
      metrics: {
        total,
        open,
        accepted,
        rejected,
        deferred,
        resolved,
      },
      highlights,
      delivery: {
        channel: input.channel,
        status: deliveryStatus,
        shouldNotify,
        notificationsEnabled,
        throttleMs: preferences.throttleMs,
        lastDeliveredAt,
        nextAllowedAt,
      },
    };
  }

  getPreferences(input: { scopeAppId: string }): CouncilBriefPreferencesReadModel {
    return this.toPreferencesReadModel(this.getOrCreatePreferences(input.scopeAppId));
  }

  updatePreferences(input: UpdateCouncilBriefPreferencesCommand): CouncilBriefPreferencesReadModel {
    const state = this.getOrCreatePreferences(input.requestedBy.appId);
    const nowIso = new Date().toISOString();

    if (typeof input.enabled === 'boolean') {
      state.enabled = input.enabled;
    }

    if (typeof input.throttleMs === 'number') {
      state.throttleMs = normalizeThrottleMs(input.throttleMs);
    }

    if (input.channels) {
      if (typeof input.channels.desktop === 'boolean') {
        state.channels.desktop = input.channels.desktop;
      }
      if (typeof input.channels.mobileLite === 'boolean') {
        state.channels.mobile_lite = input.channels.mobileLite;
      }
    }

    state.updatedAt = nowIso;
    state.updatedByActor = input.requestedBy.actor;
    state.requestId = input.requestedBy.requestId?.trim() || null;

    this.preferencesByApp.set(input.requestedBy.appId, state);

    return this.toPreferencesReadModel(state);
  }

  resetForTest(): void {
    this.preferencesByApp.clear();
  }

  private assertCouncilBriefEnabled(): void {
    if (isCouncilBriefEnabled()) {
      return;
    }

    throw new AppError(503, 'council brief delivery is disabled', 'COUNCIL_BRIEF_DISABLED', {
      envFlag: 'V3_COUNCIL_BRIEF_ENABLED',
    });
  }

  private getOrCreatePreferences(appId: string): CouncilBriefPreferenceState {
    const existing = this.preferencesByApp.get(appId);
    if (existing) {
      return existing;
    }

    const nowIso = new Date().toISOString();
    const created: CouncilBriefPreferenceState = {
      appId,
      enabled: true,
      throttleMs: DEFAULT_THROTTLE_MS,
      channels: {
        desktop: true,
        mobile_lite: true,
      },
      lastDeliveredAtByChannel: {},
      updatedAt: nowIso,
      updatedByActor: 'system:default',
      requestId: null,
    };

    this.preferencesByApp.set(appId, created);
    return created;
  }

  private toPreferencesReadModel(state: CouncilBriefPreferenceState): CouncilBriefPreferencesReadModel {
    return {
      enabled: state.enabled,
      throttleMs: state.throttleMs,
      channels: {
        desktop: state.channels.desktop,
        mobileLite: state.channels.mobile_lite,
      },
      updatedAt: state.updatedAt,
      updatedByActor: state.updatedByActor,
      requestId: state.requestId,
    };
  }

  private buildSummary(input: {
    total: number;
    open: number;
    accepted: number;
    rejected: number;
    deferred: number;
    highlights: CouncilBriefHighlight[];
  }): string {
    if (input.total === 0) {
      return '本周暂无议会建议，保持观察即可。';
    }

    const headline = input.highlights[0];
    if (!headline) {
      return `本周共 ${input.total} 条建议，待处理 ${input.open} 条。`;
    }

    return [
      `本周共 ${input.total} 条议会建议，待处理 ${input.open} 条。`,
      `已处理：接受 ${input.accepted}、拒绝 ${input.rejected}、延后 ${input.deferred}。`,
      `优先关注：${headline.title}。`,
    ].join(' ');
  }

  private toBriefId(input: {
    appId: string;
    channel: CouncilBriefChannel;
    generatedAt: string;
    statuses: Map<CouncilSuggestionStatus, number>;
    highlights: CouncilBriefHighlight[];
  }): string {
    const digestSeed = JSON.stringify({
      appId: input.appId,
      channel: input.channel,
      generatedAt: input.generatedAt,
      statuses: COUNCIL_SUGGESTION_STATUSES.reduce<Record<string, number>>((acc, status) => {
        acc[status] = input.statuses.get(status) || 0;
        return acc;
      }, {}),
      highlights: input.highlights.map((item) => item.suggestionId),
    });

    return `cbrf_${createHash('sha256').update(digestSeed).digest('hex').slice(0, 16)}`;
  }
}

export const v3CouncilBriefService = new CouncilBriefService();

export const resetV3CouncilBriefServiceForTest = (): void => {
  v3CouncilBriefService.resetForTest();
};

export const isCouncilBriefChannel = (value: string): value is CouncilBriefChannel =>
  COUNCIL_BRIEF_CHANNEL_SET.has(value);
