import { Router } from 'express';
import { AppError } from '../../../middlewares/errorHandler';
import { v3RelationshipEdgeLedgerService } from '../../../modules/relationship-graph/relationship-edge-ledger.service';
import {
  relationshipEdgeAnchorService,
  type RelationshipEdgeAnchorReadModel,
} from '../../../modules/relationship-graph/relationship-edge-anchor.service';
import { assertV3RuntimeEnabled } from '../../../platform/runtime/v3-runtime.service';

const router: Router = Router();

const FROG_ID_PATTERN = /^[1-9][0-9]*$/;
const APP_ID_PATTERN = /^[a-zA-Z0-9_:-]{2,80}$/;

const ok = <T>(res: any, data: T, status = 200) =>
  res.status(status).json({
    success: true,
    data,
  });

const fail = (res: any, status: number, message: string) =>
  res.status(status).json({
    success: false,
    message,
  });

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const isRelationshipGraphAdminReadEnabled = (): boolean =>
  parseBoolean(process.env.V3_RELATIONSHIP_GRAPH_ADMIN_READ_ENABLED, true);

const assertRelationshipGraphAdminReadEnabled = (): void => {
  if (isRelationshipGraphAdminReadEnabled()) {
    return;
  }

  throw new AppError(
    503,
    'relationship graph admin read is disabled',
    'RELATIONSHIP_GRAPH_ADMIN_READ_DISABLED'
  );
};

const parseRequiredAppId = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!APP_ID_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
};

const parseFrogId = (value: unknown): number | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!FROG_ID_PATTERN.test(normalized)) {
    return null;
  }

  const frogId = Number(normalized);
  if (!Number.isInteger(frogId) || frogId <= 0) {
    return null;
  }

  return frogId;
};

const parseLimit = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.min(parsed, 100);
};

const parseBooleanQuery = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return fallback;
    }
    return ['1', 'true', 'yes', 'on'].includes(normalized);
  }

  return fallback;
};

const toEdgeAnchorSummary = (anchor: RelationshipEdgeAnchorReadModel) => ({
  id: anchor.id,
  status: anchor.status,
  replayCount: anchor.replayCount,
  lastError: anchor.lastError,
  anchoredAt: anchor.anchoredAt,
  onchain: {
    required: anchor.onchain.required,
    enabled: anchor.onchain.enabled,
    anchored: anchor.onchain.anchored,
    anchorId: anchor.onchain.anchorId,
    chainId: anchor.onchain.chainId,
    txHash: anchor.onchain.txHash,
    blockNumber: anchor.onchain.blockNumber,
  },
});

router.get('/frogs/:frogId', async (req, res, next) => {
  const appId = parseRequiredAppId(req.query.appId);
  if (!appId) {
    return fail(res, 400, 'appId is required and must match [a-zA-Z0-9_:-]{2,80}');
  }

  const frogId = parseFrogId(req.params.frogId);
  if (!frogId) {
    return fail(res, 400, 'frogId is invalid');
  }

  const limit = parseLimit(req.query.limit);
  if (req.query.limit && !limit) {
    return fail(res, 400, 'limit must be a positive integer');
  }
  const includeAnchor = parseBooleanQuery(req.query.includeAnchor, true);

  try {
    assertRelationshipGraphAdminReadEnabled();
    assertV3RuntimeEnabled('relationshipGraph');

    const graph = await v3RelationshipEdgeLedgerService.getGraphByFrogId({
      frogId,
      scopeAppId: appId,
      ...(typeof limit === 'number' ? { limit } : {}),
    });

    const anchorByEdgeId =
      includeAnchor && graph.edges.length > 0
        ? await relationshipEdgeAnchorService.listLatestAnchorsByEdgeIds({
            scopeAppId: appId,
            edgeIds: graph.edges.map((edge) => String(edge.id)),
          })
        : new Map<string, RelationshipEdgeAnchorReadModel>();

    return ok(res, {
      ...graph,
      edges: graph.edges.map((edge) => {
        const anchor = anchorByEdgeId.get(String(edge.id));
        return {
          ...edge,
          anchor: anchor ? toEdgeAnchorSummary(anchor) : null,
        };
      }),
      filters: {
        appId,
        limit: limit || null,
      },
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
