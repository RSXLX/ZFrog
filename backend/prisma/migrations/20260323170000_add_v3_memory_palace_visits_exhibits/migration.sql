-- V3-W8-01 guestbook/witness/exhibit persistence
-- Created: 2026-03-23

CREATE TABLE IF NOT EXISTS "memory_palace_visits" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "visitorAppId" TEXT NOT NULL,
  "visitorKeyId" TEXT NOT NULL,
  "visitorActor" TEXT NOT NULL,
  "entryType" TEXT NOT NULL DEFAULT 'GUESTBOOK',
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_palace_visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "memory_palace_visits_worldId_createdAt_idx"
  ON "memory_palace_visits" ("worldId", "createdAt");

CREATE INDEX IF NOT EXISTS "memory_palace_visits_visitorAppId_createdAt_idx"
  ON "memory_palace_visits" ("visitorAppId", "createdAt");

CREATE INDEX IF NOT EXISTS "memory_palace_visits_entryType_createdAt_idx"
  ON "memory_palace_visits" ("entryType", "createdAt");

ALTER TABLE "memory_palace_visits"
  ADD CONSTRAINT "memory_palace_visits_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "memory_palace_worlds"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "memory_palace_exhibits" (
  "id" TEXT NOT NULL,
  "worldId" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "featuredByActor" TEXT NOT NULL,
  "featureReason" TEXT,
  "metadata" JSONB,
  "requestId" TEXT,
  "featuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_palace_exhibits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "memory_palace_exhibits_visitId_key"
  ON "memory_palace_exhibits" ("visitId");

CREATE INDEX IF NOT EXISTS "memory_palace_exhibits_worldId_featuredAt_idx"
  ON "memory_palace_exhibits" ("worldId", "featuredAt");

CREATE INDEX IF NOT EXISTS "memory_palace_exhibits_featuredByActor_featuredAt_idx"
  ON "memory_palace_exhibits" ("featuredByActor", "featuredAt");

ALTER TABLE "memory_palace_exhibits"
  ADD CONSTRAINT "memory_palace_exhibits_worldId_fkey"
  FOREIGN KEY ("worldId") REFERENCES "memory_palace_worlds"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "memory_palace_exhibits"
  ADD CONSTRAINT "memory_palace_exhibits_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "memory_palace_visits"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
