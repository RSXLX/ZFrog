-- V3-W10-02 creator license / asset anchor persistence
-- Created: 2026-03-24

CREATE TABLE IF NOT EXISTS "creator_asset_bindings" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "creatorAppId" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "ownerWallet" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "anchorDigest" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'BOUND',
  "replayCount" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "onchainRequired" BOOLEAN NOT NULL DEFAULT false,
  "anchoredAt" TIMESTAMP(3),
  "createdByKeyId" TEXT NOT NULL,
  "createdByActor" TEXT NOT NULL,
  "lastReplayedByActor" TEXT,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_asset_bindings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "creator_asset_bindings_assetId_checksum_ownerWallet_issuedAt_key"
  ON "creator_asset_bindings" ("assetId", "checksum", "ownerWallet", "issuedAt");

CREATE INDEX IF NOT EXISTS "creator_asset_bindings_creatorAppId_status_createdAt_idx"
  ON "creator_asset_bindings" ("creatorAppId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "creator_asset_bindings_assetId_createdAt_idx"
  ON "creator_asset_bindings" ("assetId", "createdAt");

CREATE INDEX IF NOT EXISTS "creator_asset_bindings_status_updatedAt_idx"
  ON "creator_asset_bindings" ("status", "updatedAt");

ALTER TABLE "creator_asset_bindings"
  ADD CONSTRAINT "creator_asset_bindings_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "creator_assets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "onchain_creator_assets" (
  "id" TEXT NOT NULL,
  "bindingId" TEXT NOT NULL,
  "anchorId" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'mock',
  "chainId" INTEGER,
  "txHash" TEXT,
  "blockNumber" BIGINT,
  "payload" JSONB,
  "anchoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "onchain_creator_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "onchain_creator_assets_bindingId_key"
  ON "onchain_creator_assets" ("bindingId");

CREATE UNIQUE INDEX IF NOT EXISTS "onchain_creator_assets_anchorId_key"
  ON "onchain_creator_assets" ("anchorId");

CREATE INDEX IF NOT EXISTS "onchain_creator_assets_chainId_anchoredAt_idx"
  ON "onchain_creator_assets" ("chainId", "anchoredAt");

CREATE INDEX IF NOT EXISTS "onchain_creator_assets_txHash_anchoredAt_idx"
  ON "onchain_creator_assets" ("txHash", "anchoredAt");

ALTER TABLE "onchain_creator_assets"
  ADD CONSTRAINT "onchain_creator_assets_bindingId_fkey"
  FOREIGN KEY ("bindingId") REFERENCES "creator_asset_bindings"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
