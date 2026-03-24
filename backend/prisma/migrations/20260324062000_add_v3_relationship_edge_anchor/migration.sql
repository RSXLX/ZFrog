-- V3-W11-02 relationship edge onchain anchor persistence
-- Created: 2026-03-24

CREATE TABLE IF NOT EXISTS "relationship_edge_anchors" (
  "id" TEXT NOT NULL,
  "scopeAppId" TEXT NOT NULL,
  "edgeId" TEXT NOT NULL,
  "frogId" INTEGER NOT NULL,
  "peerFrogId" INTEGER NOT NULL,
  "anchorDigest" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "replayCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "onchainRequired" BOOLEAN NOT NULL DEFAULT false,
  "anchoredAt" TIMESTAMP(3),
  "createdByKeyId" TEXT NOT NULL,
  "createdByActor" TEXT NOT NULL,
  "lastReplayedByActor" TEXT,
  "requestId" TEXT,
  "edgeSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "relationship_edge_anchors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "relationship_edge_anchors_edgeId_fkey"
    FOREIGN KEY ("edgeId") REFERENCES "relationship_edges"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "relationship_edge_anchors_scopeAppId_edgeId_anchorDigest_key"
  ON "relationship_edge_anchors" ("scopeAppId", "edgeId", "anchorDigest");

CREATE INDEX IF NOT EXISTS "relationship_edge_anchors_scopeAppId_status_updatedAt_idx"
  ON "relationship_edge_anchors" ("scopeAppId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "relationship_edge_anchors_scopeAppId_frogId_updatedAt_idx"
  ON "relationship_edge_anchors" ("scopeAppId", "frogId", "updatedAt");

CREATE INDEX IF NOT EXISTS "relationship_edge_anchors_edgeId_createdAt_idx"
  ON "relationship_edge_anchors" ("edgeId", "createdAt");

CREATE TABLE IF NOT EXISTS "onchain_relationship_edge_anchors" (
  "id" TEXT NOT NULL,
  "anchorRecordId" TEXT NOT NULL,
  "anchorId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'mock',
  "chainId" INTEGER,
  "txHash" TEXT,
  "blockNumber" BIGINT,
  "payload" JSONB,
  "anchoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "onchain_relationship_edge_anchors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "onchain_relationship_edge_anchors_anchorRecordId_fkey"
    FOREIGN KEY ("anchorRecordId") REFERENCES "relationship_edge_anchors"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "onchain_relationship_edge_anchors_anchorRecordId_key"
  ON "onchain_relationship_edge_anchors" ("anchorRecordId");

CREATE UNIQUE INDEX IF NOT EXISTS "onchain_relationship_edge_anchors_anchorId_key"
  ON "onchain_relationship_edge_anchors" ("anchorId");

CREATE INDEX IF NOT EXISTS "onchain_relationship_edge_anchors_chainId_anchoredAt_idx"
  ON "onchain_relationship_edge_anchors" ("chainId", "anchoredAt");

CREATE INDEX IF NOT EXISTS "onchain_relationship_edge_anchors_txHash_anchoredAt_idx"
  ON "onchain_relationship_edge_anchors" ("txHash", "anchoredAt");
