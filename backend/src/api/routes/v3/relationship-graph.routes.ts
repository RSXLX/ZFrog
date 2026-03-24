import { Router, type Request } from 'express';
import { respondSuccess } from '../../response';
import { AppError, asyncHandler } from '../../../middlewares/errorHandler';
import {
  getV3IntegrationAccess,
  v3IntegrationAuthRequired,
} from '../../../middlewares/v3-integration-auth.middleware';
import { assertV3RuntimeEnabled } from '../../../platform/runtime/v3-runtime.service';
import { v3RelationshipEdgeLedgerService } from '../../../modules/relationship-graph/relationship-edge-ledger.service';
import {
  relationshipEdgeAnchorService,
  type RelationshipEdgeAnchorReadModel,
} from '../../../modules/relationship-graph/relationship-edge-anchor.service';

const router: Router = Router();

const FROG_ID_PATTERN = /^[1-9][0-9]*$/;

const parseFrogId = (value: string): number => {
  const normalized = value.trim();
  if (!FROG_ID_PATTERN.test(normalized)) {
    throw new AppError(400, 'frogId is invalid', 'INVALID_INPUT', {
      frogId: value,
    });
  }

  const frogId = Number(normalized);
  if (!Number.isInteger(frogId) || frogId <= 0) {
    throw new AppError(400, 'frogId is invalid', 'INVALID_INPUT', {
      frogId: value,
    });
  }

  return frogId;
};

const parseLimit = (value: unknown): number | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, 'limit must be a positive integer', 'INVALID_INPUT', {
      limit: value,
    });
  }

  return parsed;
};

const parseBoolean = (value: unknown, fallback: boolean): boolean => {
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

const getIntegrationActor = (req: Request): {
  appId: string;
  keyId: string;
  actor: string;
  requestId: string | null;
} => {
  const integration = getV3IntegrationAccess(req);
  return {
    appId: integration.app.id,
    keyId: integration.key.id,
    actor: `${integration.app.slug}:${integration.key.id}`,
    requestId: req.requestId ?? null,
  };
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

router.get(
  '/frogs/:frogId',
  v3IntegrationAuthRequired({
    permission: 'relationship_graph.read',
    module: 'relationshipGraph',
    action: 'read',
  }),
  asyncHandler(async (req, res) => {
    assertV3RuntimeEnabled('relationshipGraph');

    const frogId = parseFrogId(req.params.frogId);
    const limit = parseLimit(req.query.limit);
    const includeAnchor = parseBoolean(req.query.includeAnchor, true);
    const actor = getIntegrationActor(req);

    const graph = await v3RelationshipEdgeLedgerService.getGraphByFrogId({
      frogId,
      scopeAppId: actor.appId,
      ...(typeof limit === 'number' ? { limit } : {}),
    });

    const anchorByEdgeId =
      includeAnchor && graph.edges.length > 0
        ? await relationshipEdgeAnchorService.listLatestAnchorsByEdgeIds({
            scopeAppId: actor.appId,
            edgeIds: graph.edges.map((edge) => String(edge.id)),
          })
        : new Map<string, RelationshipEdgeAnchorReadModel>();

    return respondSuccess(req, res, {
      ...graph,
      edges: graph.edges.map((edge) => {
        const anchor = anchorByEdgeId.get(String(edge.id));
        return {
          ...edge,
          anchor: anchor ? toEdgeAnchorSummary(anchor) : null,
        };
      }),
    });
  })
);

export default router;
