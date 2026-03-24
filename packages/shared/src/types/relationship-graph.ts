export const V3_RELATIONSHIP_EDGE_SIGNAL_TYPES = [
  'JOURNEY',
  'RESCUE',
  'WITNESS',
  'CONTRIBUTION',
] as const;

export const V3_RELATIONSHIP_EDGE_STRENGTHS = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const V3_RELATIONSHIP_EDGE_ANCHOR_STATUSES = ['PENDING', 'ANCHORED', 'FAILED'] as const;

export type V3RelationshipEdgeSignalType =
  (typeof V3_RELATIONSHIP_EDGE_SIGNAL_TYPES)[number];

export type V3RelationshipEdgeStrength = (typeof V3_RELATIONSHIP_EDGE_STRENGTHS)[number];
export type V3RelationshipEdgeAnchorStatus =
  (typeof V3_RELATIONSHIP_EDGE_ANCHOR_STATUSES)[number];

export interface V3RelationshipEdgeSignalCounts {
  journey: number;
  rescue: number;
  witness: number;
  contribution: number;
}

export interface V3RelationshipEdgeAnchorReadModel {
  id: string;
  status: V3RelationshipEdgeAnchorStatus;
  replayCount: number;
  lastError: string | null;
  anchoredAt: string | null;
  onchain: {
    required: boolean;
    enabled: boolean;
    anchored: boolean;
    anchorId: string | null;
    chainId: number | null;
    txHash: string | null;
    blockNumber: string | null;
  };
}

export interface V3RelationshipGraphEdgeReadModel {
  id: string;
  frogId: number;
  peerFrogId: number;
  sourceFrogId: number;
  targetFrogId: number;
  score: number;
  signalCount: number;
  strength: V3RelationshipEdgeStrength;
  firstOccurredAt: string;
  lastOccurredAt: string;
  signals: V3RelationshipEdgeSignalCounts;
  anchor: V3RelationshipEdgeAnchorReadModel | null;
}

export interface V3RelationshipEdgeSnapshotReadModel {
  id: string;
  scopeAppId: string;
  frogId: number;
  version: number;
  computedAt: string;
  totalEdges: number;
  totalScore: number;
  strongestPeerFrogId: number | null;
  strongestScore: number | null;
  digest: string;
}

export interface V3RelationshipGraphNodeReadModel {
  frogId: number;
  role: 'ROOT' | 'PEER';
  rank: number;
  score: number;
  signalCount: number;
  lastOccurredAt: string | null;
}

export interface V3RelationshipGraphReadModel {
  frogId: number;
  scopeAppId: string;
  generatedAt: string;
  summary: {
    totalEdges: number;
    totalSignalCount: number;
    totalScore: number;
  };
  nodes: V3RelationshipGraphNodeReadModel[];
  edges: V3RelationshipGraphEdgeReadModel[];
  snapshot: V3RelationshipEdgeSnapshotReadModel;
}
