import { z } from 'zod';
import {
  V3_RELATIONSHIP_EDGE_ANCHOR_STATUSES,
  V3_RELATIONSHIP_EDGE_SIGNAL_TYPES,
  V3_RELATIONSHIP_EDGE_STRENGTHS,
} from '../types/relationship-graph';

export const v3RelationshipEdgeSignalTypeSchema = z.enum(V3_RELATIONSHIP_EDGE_SIGNAL_TYPES);
export const v3RelationshipEdgeStrengthSchema = z.enum(V3_RELATIONSHIP_EDGE_STRENGTHS);
export const v3RelationshipEdgeAnchorStatusSchema = z.enum(V3_RELATIONSHIP_EDGE_ANCHOR_STATUSES);

export const v3RelationshipEdgeSignalCountsSchema = z.object({
  journey: z.number().int().nonnegative(),
  rescue: z.number().int().nonnegative(),
  witness: z.number().int().nonnegative(),
  contribution: z.number().int().nonnegative(),
});

export const v3RelationshipEdgeAnchorReadModelSchema = z.object({
  id: z.string().min(1),
  status: v3RelationshipEdgeAnchorStatusSchema,
  replayCount: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  anchoredAt: z.string().datetime().nullable(),
  onchain: z.object({
    required: z.boolean(),
    enabled: z.boolean(),
    anchored: z.boolean(),
    anchorId: z.string().min(1).nullable(),
    chainId: z.number().int().positive().nullable(),
    txHash: z.string().min(1).nullable(),
    blockNumber: z.string().min(1).nullable(),
  }),
});

export const v3RelationshipGraphEdgeReadModelSchema = z.object({
  id: z.string().min(1),
  frogId: z.number().int().positive(),
  peerFrogId: z.number().int().positive(),
  sourceFrogId: z.number().int().positive(),
  targetFrogId: z.number().int().positive(),
  score: z.number().int().nonnegative(),
  signalCount: z.number().int().nonnegative(),
  strength: v3RelationshipEdgeStrengthSchema,
  firstOccurredAt: z.string().datetime(),
  lastOccurredAt: z.string().datetime(),
  signals: v3RelationshipEdgeSignalCountsSchema,
  anchor: v3RelationshipEdgeAnchorReadModelSchema.nullable(),
});

export const v3RelationshipEdgeSnapshotReadModelSchema = z.object({
  id: z.string().min(1),
  scopeAppId: z.string().min(1),
  frogId: z.number().int().positive(),
  version: z.number().int().positive(),
  computedAt: z.string().datetime(),
  totalEdges: z.number().int().nonnegative(),
  totalScore: z.number().int().nonnegative(),
  strongestPeerFrogId: z.number().int().positive().nullable(),
  strongestScore: z.number().int().nonnegative().nullable(),
  digest: z.string().min(1),
});

export const v3RelationshipGraphNodeReadModelSchema = z.object({
  frogId: z.number().int().positive(),
  role: z.enum(['ROOT', 'PEER']),
  rank: z.number().int().nonnegative(),
  score: z.number().int().nonnegative(),
  signalCount: z.number().int().nonnegative(),
  lastOccurredAt: z.string().datetime().nullable(),
});

export const v3RelationshipGraphReadModelSchema = z.object({
  frogId: z.number().int().positive(),
  scopeAppId: z.string().min(1),
  generatedAt: z.string().datetime(),
  summary: z.object({
    totalEdges: z.number().int().nonnegative(),
    totalSignalCount: z.number().int().nonnegative(),
    totalScore: z.number().int().nonnegative(),
  }),
  nodes: z.array(v3RelationshipGraphNodeReadModelSchema).min(1),
  edges: z.array(v3RelationshipGraphEdgeReadModelSchema),
  snapshot: v3RelationshipEdgeSnapshotReadModelSchema,
});
