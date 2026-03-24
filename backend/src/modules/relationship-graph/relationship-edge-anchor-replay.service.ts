import { AppError } from '../../middlewares/errorHandler';
import {
  RELATIONSHIP_EDGE_ANCHOR_STATUSES,
  type RelationshipEdgeAnchorMutationResult,
  type RelationshipEdgeAnchorReadModel,
  type RelationshipEdgeAnchorService,
  type RelationshipEdgeAnchorStatus,
  relationshipEdgeAnchorService,
} from './relationship-edge-anchor.service';

const DEFAULT_REPLAY_LIMIT = 100;
const MAX_REPLAY_LIMIT = 500;

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const normalizeLimit = (limit?: number): number => {
  if (!Number.isInteger(limit) || !limit || limit <= 0) {
    return DEFAULT_REPLAY_LIMIT;
  }

  return Math.min(limit, MAX_REPLAY_LIMIT);
};

const normalizeScopeAppId = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError(400, 'scopeAppId is required', 'INVALID_INPUT', {
      field: 'scopeAppId',
    });
  }

  if (normalized.length > 80) {
    throw new AppError(400, 'scopeAppId must be <= 80 characters', 'INVALID_INPUT', {
      field: 'scopeAppId',
      maxLength: 80,
    });
  }

  return normalized;
};

const normalizeActor = (value: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new AppError(400, 'actor is required', 'INVALID_INPUT', {
      field: 'actor',
    });
  }

  if (normalized.length > 120) {
    throw new AppError(400, 'actor must be <= 120 characters', 'INVALID_INPUT', {
      field: 'actor',
      maxLength: 120,
    });
  }

  return normalized;
};

const normalizeStatuses = (
  statuses?: RelationshipEdgeAnchorStatus[]
): RelationshipEdgeAnchorStatus[] => {
  if (!statuses || statuses.length === 0) {
    return ['FAILED', 'PENDING'];
  }

  for (const status of statuses) {
    if (!RELATIONSHIP_EDGE_ANCHOR_STATUSES.includes(status)) {
      throw new AppError(400, 'status is invalid', 'INVALID_INPUT', {
        status,
        allowed: RELATIONSHIP_EDGE_ANCHOR_STATUSES,
      });
    }
  }

  return statuses;
};

const isReplayEnabled = (): boolean =>
  parseBoolean(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_ENABLED, true);

export interface ReplayRelationshipEdgeAnchorsCommand {
  scopeAppId: string;
  keyId: string;
  actor: string;
  requestId?: string | null;
  source?: string;
  statuses?: RelationshipEdgeAnchorStatus[];
  limit?: number;
  dryRun?: boolean;
}

export interface ReplayRelationshipEdgeAnchorsResult {
  scopeAppId: string;
  dryRun: boolean;
  scannedCount: number;
  replayedCount: number;
  anchoredCount: number;
  failedCount: number;
  skippedCount: number;
  candidateAnchorIds: string[];
  failedAnchorIds: string[];
  skippedByReason: Record<string, number>;
}

const increment = (target: Record<string, number>, key: string): void => {
  target[key] = (target[key] || 0) + 1;
};

export class RelationshipEdgeAnchorReplayService {
  private readonly anchorService: Pick<
    RelationshipEdgeAnchorService,
    'listReplayCandidates' | 'replayAnchor'
  >;

  constructor(deps?: {
    anchorService?: Pick<RelationshipEdgeAnchorService, 'listReplayCandidates' | 'replayAnchor'>;
  }) {
    this.anchorService = deps?.anchorService || relationshipEdgeAnchorService;
  }

  async replayCandidates(
    input: ReplayRelationshipEdgeAnchorsCommand
  ): Promise<ReplayRelationshipEdgeAnchorsResult> {
    this.assertReplayEnabled();

    const scopeAppId = normalizeScopeAppId(input.scopeAppId);
    const actor = normalizeActor(input.actor);
    const limit = normalizeLimit(input.limit);
    const dryRun = Boolean(input.dryRun);
    const statuses = normalizeStatuses(input.statuses);
    const requestId = input.requestId?.trim() || null;

    const candidates = await this.anchorService.listReplayCandidates({
      scopeAppId,
      statuses,
      limit,
    });

    const skippedByReason: Record<string, number> = {};
    const result: ReplayRelationshipEdgeAnchorsResult = {
      scopeAppId,
      dryRun,
      scannedCount: candidates.length,
      replayedCount: 0,
      anchoredCount: 0,
      failedCount: 0,
      skippedCount: 0,
      candidateAnchorIds: candidates.map((candidate) => candidate.id),
      failedAnchorIds: [],
      skippedByReason,
    };

    if (dryRun) {
      return result;
    }

    for (const candidate of candidates) {
      if (candidate.status === 'ANCHORED') {
        result.skippedCount += 1;
        increment(skippedByReason, 'already_anchored');
        continue;
      }

      let replayed: RelationshipEdgeAnchorMutationResult;
      try {
        replayed = await this.anchorService.replayAnchor({
          anchorId: candidate.id,
          scopeAppId,
          force: true,
          requestedBy: {
            actor,
            requestId,
          },
        });
      } catch (error) {
        result.failedCount += 1;
        result.failedAnchorIds.push(candidate.id);

        if (error instanceof AppError) {
          increment(skippedByReason, error.code || 'app_error');
        } else {
          increment(skippedByReason, 'unknown_error');
        }

        continue;
      }

      result.replayedCount += replayed.replayed ? 1 : 0;
      if (replayed.anchor.status === 'ANCHORED') {
        result.anchoredCount += 1;
      } else {
        result.failedCount += 1;
        result.failedAnchorIds.push(replayed.anchor.id);
        increment(skippedByReason, 'replay_not_anchored');
      }
    }

    return result;
  }

  private assertReplayEnabled(): void {
    if (isReplayEnabled()) {
      return;
    }

    throw new AppError(
      503,
      'relationship edge anchor replay is disabled',
      'RELATIONSHIP_EDGE_ANCHOR_REPLAY_DISABLED'
    );
  }
}

export const relationshipEdgeAnchorReplayService = new RelationshipEdgeAnchorReplayService();

export type { RelationshipEdgeAnchorReadModel };
