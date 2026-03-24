-- V3-W11-01 relationship edge ledger persistence
-- Created: 2026-03-24

CREATE TABLE IF NOT EXISTS "relationship_edges" (
  "id" TEXT NOT NULL,
  "scopeAppId" TEXT NOT NULL,
  "frogId" INTEGER NOT NULL,
  "peerFrogId" INTEGER NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "signalCount" INTEGER NOT NULL DEFAULT 0,
  "journeyCount" INTEGER NOT NULL DEFAULT 0,
  "rescueCount" INTEGER NOT NULL DEFAULT 0,
  "witnessCount" INTEGER NOT NULL DEFAULT 0,
  "contributionCount" INTEGER NOT NULL DEFAULT 0,
  "firstOccurredAt" TIMESTAMP(3) NOT NULL,
  "lastOccurredAt" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "relationship_edges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "relationship_edges_scopeAppId_frogId_peerFrogId_key"
  ON "relationship_edges" ("scopeAppId", "frogId", "peerFrogId");

CREATE INDEX IF NOT EXISTS "relationship_edges_scopeAppId_frogId_lastOccurredAt_idx"
  ON "relationship_edges" ("scopeAppId", "frogId", "lastOccurredAt");

CREATE INDEX IF NOT EXISTS "relationship_edges_scopeAppId_peerFrogId_lastOccurredAt_idx"
  ON "relationship_edges" ("scopeAppId", "peerFrogId", "lastOccurredAt");

CREATE INDEX IF NOT EXISTS "relationship_edges_scopeAppId_score_lastOccurredAt_idx"
  ON "relationship_edges" ("scopeAppId", "score", "lastOccurredAt");

CREATE TABLE IF NOT EXISTS "relationship_edge_snapshots" (
  "id" TEXT NOT NULL,
  "scopeAppId" TEXT NOT NULL,
  "frogId" INTEGER NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "totalEdges" INTEGER NOT NULL,
  "totalScore" INTEGER NOT NULL,
  "strongestPeerFrogId" INTEGER,
  "strongestScore" INTEGER,
  "digest" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "relationship_edge_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "relationship_edge_snapshots_scopeAppId_frogId_computedAt_idx"
  ON "relationship_edge_snapshots" ("scopeAppId", "frogId", "computedAt");

CREATE INDEX IF NOT EXISTS "relationship_edge_snapshots_scopeAppId_computedAt_idx"
  ON "relationship_edge_snapshots" ("scopeAppId", "computedAt");
