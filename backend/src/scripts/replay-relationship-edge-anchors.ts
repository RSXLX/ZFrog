import { disconnectDatabase } from '../database';
import {
  RELATIONSHIP_EDGE_ANCHOR_STATUSES,
  type RelationshipEdgeAnchorStatus,
  relationshipEdgeAnchorService,
} from '../modules/relationship-graph/relationship-edge-anchor.service';
import { relationshipEdgeAnchorReplayService } from '../modules/relationship-graph/relationship-edge-anchor-replay.service';

const getArgValue = (flag: string): string | undefined => {
  const arg = process.argv.slice(2).find((entry) => entry.startsWith(`${flag}=`));
  if (!arg) {
    return undefined;
  }
  return arg.slice(flag.length + 1);
};

const hasFlag = (flag: string): boolean => process.argv.slice(2).includes(flag);

const toPositiveInt = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
};

const toStatuses = (raw?: string): RelationshipEdgeAnchorStatus[] | undefined => {
  if (!raw?.trim()) {
    return undefined;
  }

  const statuses = raw
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean) as RelationshipEdgeAnchorStatus[];

  if (statuses.length === 0) {
    return undefined;
  }

  for (const status of statuses) {
    if (!RELATIONSHIP_EDGE_ANCHOR_STATUSES.includes(status)) {
      throw new Error(
        `invalid status "${status}", allowed: ${RELATIONSHIP_EDGE_ANCHOR_STATUSES.join(',')}`
      );
    }
  }

  return statuses;
};

async function main() {
  const scopeAppId =
    getArgValue('--scope-app-id') || process.env.V3_RELATIONSHIP_EDGE_ANCHOR_APP_ID || '';
  const keyId =
    getArgValue('--key-id') || process.env.V3_RELATIONSHIP_EDGE_ANCHOR_KEY_ID || 'system';
  const actor =
    getArgValue('--actor') ||
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_ACTOR ||
    'system:relationship-edge-anchor';
  const requestId = getArgValue('--request-id') || null;
  const source =
    getArgValue('--source') ||
    process.env.V3_RELATIONSHIP_EDGE_ANCHOR_SOURCE ||
    'script.replay-relationship-edge-anchors';

  const edgeLimit =
    toPositiveInt(getArgValue('--edge-limit')) ||
    toPositiveInt(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_EDGE_LIMIT);
  const replayLimit =
    toPositiveInt(getArgValue('--replay-limit')) ||
    toPositiveInt(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_LIMIT);
  const statuses =
    toStatuses(getArgValue('--statuses')) ||
    toStatuses(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_REPLAY_STATUSES);
  const dryRun = hasFlag('--dry-run');

  if (!scopeAppId.trim()) {
    throw new Error(
      'scope app id is required, pass --scope-app-id=<appId> or set V3_RELATIONSHIP_EDGE_ANCHOR_APP_ID'
    );
  }

  const anchored = await relationshipEdgeAnchorService.anchorTopEdges({
    scopeAppId,
    ...(edgeLimit ? { limit: edgeLimit } : {}),
    dryRun,
    requestedBy: {
      appId: scopeAppId,
      keyId,
      actor,
      requestId,
    },
  });

  const replayed = await relationshipEdgeAnchorReplayService.replayCandidates({
    scopeAppId,
    keyId,
    actor,
    requestId,
    source,
    ...(replayLimit ? { limit: replayLimit } : {}),
    ...(statuses ? { statuses } : {}),
    dryRun,
  });

  console.log(
    JSON.stringify(
      {
        scopeAppId,
        dryRun,
        anchored,
        replayed,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error('[RelationshipEdgeAnchorReplay] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
