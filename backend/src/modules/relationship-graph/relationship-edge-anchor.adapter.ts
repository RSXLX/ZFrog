import { createHash, randomBytes } from 'crypto';

export interface RelationshipEdgeAnchorAdapterInput {
  scopeAppId: string;
  edgeId: string;
  anchorDigest: string;
  frogId: number;
  peerFrogId: number;
  score: number;
  signalCount: number;
  replayCount: number;
}

export interface RelationshipEdgeAnchorAdapterResult {
  mode: string;
  anchorId: string;
  chainId: number | null;
  txHash: string;
  blockNumber: bigint;
  payload: Record<string, unknown>;
}

export interface RelationshipEdgeOnchainAdapter {
  submitAnchor(input: RelationshipEdgeAnchorAdapterInput): Promise<RelationshipEdgeAnchorAdapterResult>;
}

const parseBoolean = (raw: string | undefined, fallback: boolean): boolean => {
  if (raw === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
};

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (!raw?.trim()) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const computeAnchorId = (anchorDigest: string): string =>
  `0x${createHash('sha256').update(anchorDigest).digest('hex')}`;

export class MockRelationshipEdgeOnchainAdapter implements RelationshipEdgeOnchainAdapter {
  async submitAnchor(
    input: RelationshipEdgeAnchorAdapterInput
  ): Promise<RelationshipEdgeAnchorAdapterResult> {
    const forceFail = parseBoolean(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL, false);
    if (forceFail) {
      throw new Error('forced failure by V3_RELATIONSHIP_EDGE_ANCHOR_FORCE_FAIL');
    }

    const chainId = parsePositiveInt(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_CHAIN_ID, 7000);
    const randomSeed = randomBytes(8).toString('hex');
    const txHash = `0x${createHash('sha256')
      .update(`${input.anchorDigest}|${input.replayCount}|${Date.now()}|${randomSeed}`)
      .digest('hex')}`;

    const blockBase = BigInt(parsePositiveInt(process.env.V3_RELATIONSHIP_EDGE_ANCHOR_BLOCK_BASE, 9_100_000));
    const blockNumber = blockBase + BigInt(input.replayCount);
    const anchorId = computeAnchorId(input.anchorDigest);

    return {
      mode: 'mock',
      anchorId,
      chainId,
      txHash,
      blockNumber,
      payload: {
        scopeAppId: input.scopeAppId,
        edgeId: input.edgeId,
        frogId: input.frogId,
        peerFrogId: input.peerFrogId,
        score: input.score,
        signalCount: input.signalCount,
        replayCount: input.replayCount,
        anchorDigest: input.anchorDigest,
        anchorId,
        contractHint: 'RelationshipEdgeAnchorHook.anchorEdge',
      },
    };
  }
}

export const relationshipEdgeOnchainAdapter = new MockRelationshipEdgeOnchainAdapter();
