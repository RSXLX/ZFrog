import { disconnectDatabase } from '../database';
import { relationshipEdgeReplayService } from '../modules/relationship-graph/relationship-edge-replay.service';

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

const toEventId = (value?: string): bigint | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim();
  if (!/^[0-9]+$/.test(normalized)) {
    return undefined;
  }
  return BigInt(normalized);
};

async function main() {
  const scopeAppId =
    getArgValue('--scope-app-id') || process.env.V3_RELATIONSHIP_EDGE_REPLAY_APP_ID || '';
  const keyId = getArgValue('--key-id') || process.env.V3_RELATIONSHIP_EDGE_REPLAY_KEY_ID || 'system';
  const actor =
    getArgValue('--actor') ||
    process.env.V3_RELATIONSHIP_EDGE_REPLAY_ACTOR ||
    'system:relationship-edge-replay';
  const requestId = getArgValue('--request-id') || null;
  const source =
    getArgValue('--source') || process.env.V3_RELATIONSHIP_EDGE_REPLAY_SOURCE || undefined;
  const sinceEventId =
    toEventId(getArgValue('--since-event-id')) ||
    toEventId(process.env.V3_RELATIONSHIP_EDGE_REPLAY_SINCE_EVENT_ID);
  const limit =
    toPositiveInt(getArgValue('--limit')) ||
    toPositiveInt(process.env.V3_RELATIONSHIP_EDGE_REPLAY_LIMIT);
  const dryRun = hasFlag('--dry-run');

  if (!scopeAppId.trim()) {
    throw new Error(
      'scope app id is required, pass --scope-app-id=<appId> or set V3_RELATIONSHIP_EDGE_REPLAY_APP_ID'
    );
  }

  const result = await relationshipEdgeReplayService.replayFromDomainEvents({
    scopeAppId,
    keyId,
    actor,
    requestId,
    source: source || 'script.replay-relationship-edge-signals',
    ...(sinceEventId !== undefined ? { sinceEventId } : {}),
    ...(limit !== undefined ? { limit } : {}),
    dryRun,
  });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error('[RelationshipEdgeReplay] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
