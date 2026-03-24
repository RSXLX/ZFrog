-- V3-W9-01 creator asset pipeline + pack draft persistence
-- Created: 2026-03-24

CREATE TABLE IF NOT EXISTS "creator_profiles" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "creator_profiles_appId_key"
  ON "creator_profiles" ("appId");

CREATE INDEX IF NOT EXISTS "creator_profiles_status_createdAt_idx"
  ON "creator_profiles" ("status", "createdAt");

CREATE TABLE IF NOT EXISTS "creator_assets" (
  "id" TEXT NOT NULL,
  "creatorAppId" TEXT NOT NULL,
  "createdByKeyId" TEXT NOT NULL,
  "createdByActor" TEXT NOT NULL,
  "requestId" TEXT,
  "assetType" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sourceUrl" TEXT NOT NULL,
  "checksum" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "preview" JSONB NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_assets_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "creator_assets_creatorAppId_createdAt_idx"
  ON "creator_assets" ("creatorAppId", "createdAt");

CREATE INDEX IF NOT EXISTS "creator_assets_assetType_status_createdAt_idx"
  ON "creator_assets" ("assetType", "status", "createdAt");

ALTER TABLE "creator_assets"
  ADD CONSTRAINT "creator_assets_creatorAppId_fkey"
  FOREIGN KEY ("creatorAppId") REFERENCES "creator_profiles"("appId")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "creator_packs" (
  "id" TEXT NOT NULL,
  "creatorAppId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "previewState" TEXT NOT NULL DEFAULT 'READY',
  "createdByKeyId" TEXT NOT NULL,
  "createdByActor" TEXT NOT NULL,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_packs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "creator_packs_creatorAppId_slug_key"
  ON "creator_packs" ("creatorAppId", "slug");

CREATE INDEX IF NOT EXISTS "creator_packs_creatorAppId_status_createdAt_idx"
  ON "creator_packs" ("creatorAppId", "status", "createdAt");

ALTER TABLE "creator_packs"
  ADD CONSTRAINT "creator_packs_creatorAppId_fkey"
  FOREIGN KEY ("creatorAppId") REFERENCES "creator_profiles"("appId")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "creator_pack_assets" (
  "id" TEXT NOT NULL,
  "packId" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "creator_pack_assets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "creator_pack_assets_packId_assetId_key"
  ON "creator_pack_assets" ("packId", "assetId");

CREATE INDEX IF NOT EXISTS "creator_pack_assets_assetId_idx"
  ON "creator_pack_assets" ("assetId");

CREATE INDEX IF NOT EXISTS "creator_pack_assets_packId_sortOrder_idx"
  ON "creator_pack_assets" ("packId", "sortOrder");

ALTER TABLE "creator_pack_assets"
  ADD CONSTRAINT "creator_pack_assets_packId_fkey"
  FOREIGN KEY ("packId") REFERENCES "creator_packs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "creator_pack_assets"
  ADD CONSTRAINT "creator_pack_assets_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "creator_assets"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
