-- V3-W7-01 collaborative memory world persistence baseline
-- Created: 2026-03-23

CREATE TABLE IF NOT EXISTS "memory_palace_worlds" (
  "id" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "templateSlug" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "ownerAppId" TEXT NOT NULL,
  "ownerKeyId" TEXT NOT NULL,
  "createdByActor" TEXT NOT NULL,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_palace_worlds_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "memory_palace_worlds_ownerAppId_createdAt_idx"
  ON "memory_palace_worlds" ("ownerAppId", "createdAt");

CREATE INDEX IF NOT EXISTS "memory_palace_worlds_journeyId_createdAt_idx"
  ON "memory_palace_worlds" ("journeyId", "createdAt");

CREATE INDEX IF NOT EXISTS "memory_palace_worlds_status_createdAt_idx"
  ON "memory_palace_worlds" ("status", "createdAt");

CREATE TABLE IF NOT EXISTS "memory_palace_collaborators" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CONTRIBUTOR',
  "addedByActor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_palace_collaborators_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "memory_palace_collaborators_worldId_appId_key"
  ON "memory_palace_collaborators" ("worldId", "appId");

CREATE INDEX IF NOT EXISTS "memory_palace_collaborators_appId_createdAt_idx"
  ON "memory_palace_collaborators" ("appId", "createdAt");

ALTER TABLE "memory_palace_collaborators"
  ADD CONSTRAINT "memory_palace_collaborators_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "memory_palace_worlds"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "memory_palace_contributions" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "actor" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_palace_contributions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "memory_palace_contributions_worldId_createdAt_idx"
  ON "memory_palace_contributions" ("worldId", "createdAt");

CREATE INDEX IF NOT EXISTS "memory_palace_contributions_appId_createdAt_idx"
  ON "memory_palace_contributions" ("appId", "createdAt");

CREATE INDEX IF NOT EXISTS "memory_palace_contributions_type_createdAt_idx"
  ON "memory_palace_contributions" ("type", "createdAt");

ALTER TABLE "memory_palace_contributions"
  ADD CONSTRAINT "memory_palace_contributions_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "memory_palace_worlds"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "memory_palace_templates" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "config" JSONB,
  "createdByAppId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_palace_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "memory_palace_templates_slug_key"
  ON "memory_palace_templates" ("slug");

CREATE INDEX IF NOT EXISTS "memory_palace_templates_status_createdAt_idx"
  ON "memory_palace_templates" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "memory_palace_templates_createdByAppId_createdAt_idx"
  ON "memory_palace_templates" ("createdByAppId", "createdAt");
