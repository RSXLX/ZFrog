-- V1 core domain tables
-- Issue: V1-I04
-- Created: 2026-03-20

CREATE TABLE IF NOT EXISTS "auth_nonces" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_nonces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "human_verifications" (
  "id" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "signal" TEXT,
  "nullifierHash" TEXT,
  "proof" JSONB NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT true,
  "provider" TEXT NOT NULL DEFAULT 'world',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "human_verifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "egg_profiles" (
  "id" SERIAL NOT NULL,
  "frogId" INTEGER NOT NULL,
  "claimStatus" TEXT NOT NULL DEFAULT 'HATCHED',
  "claimedAt" TIMESTAMP(3),
  "hatchReadyAt" TIMESTAMP(3),
  "hatchedAt" TIMESTAMP(3),
  "imprintSeed" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "egg_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "pet_states" (
  "id" SERIAL NOT NULL,
  "frogId" INTEGER NOT NULL,
  "lifeStage" TEXT NOT NULL DEFAULT 'ACTIVE',
  "hunger" INTEGER NOT NULL DEFAULT 100,
  "happiness" INTEGER NOT NULL DEFAULT 100,
  "health" INTEGER NOT NULL DEFAULT 100,
  "energy" INTEGER NOT NULL DEFAULT 100,
  "cleanliness" INTEGER NOT NULL DEFAULT 100,
  "isSick" BOOLEAN NOT NULL DEFAULT false,
  "isDormant" BOOLEAN NOT NULL DEFAULT false,
  "lastCareAt" TIMESTAMP(3),
  "lastStateSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pet_states_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "soul_profiles" (
  "id" SERIAL NOT NULL,
  "frogId" INTEGER NOT NULL,
  "personality" TEXT,
  "imprintText" TEXT,
  "temperament" JSONB,
  "bondedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "soul_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "relationship_events" (
  "id" BIGSERIAL NOT NULL,
  "frogId" INTEGER NOT NULL,
  "actorFrogId" INTEGER,
  "counterpartyFrogId" INTEGER,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "relationship_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rituals" (
  "id" BIGSERIAL NOT NULL,
  "frogId" INTEGER NOT NULL,
  "targetFrogId" INTEGER,
  "ritualType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "payload" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rituals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "memory_palaces" (
  "id" SERIAL NOT NULL,
  "frogId" INTEGER NOT NULL,
  "recapText" TEXT,
  "timeline" JSONB,
  "highlights" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memory_palaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "onchain_milestones" (
  "id" BIGSERIAL NOT NULL,
  "frogId" INTEGER NOT NULL,
  "travelId" INTEGER,
  "milestoneType" TEXT NOT NULL,
  "chainId" INTEGER,
  "txHash" TEXT,
  "blockNumber" BIGINT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "onchain_milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "domain_events" (
  "id" BIGSERIAL NOT NULL,
  "frogId" INTEGER,
  "travelId" INTEGER,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT,
  "eventType" TEXT NOT NULL,
  "eventVersion" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestId" TEXT,
  "traceId" TEXT,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "human_verifications_nullifierHash_key" ON "human_verifications" ("nullifierHash");
CREATE UNIQUE INDEX IF NOT EXISTS "egg_profiles_frogId_key" ON "egg_profiles" ("frogId");
CREATE UNIQUE INDEX IF NOT EXISTS "pet_states_frogId_key" ON "pet_states" ("frogId");
CREATE UNIQUE INDEX IF NOT EXISTS "soul_profiles_frogId_key" ON "soul_profiles" ("frogId");
CREATE UNIQUE INDEX IF NOT EXISTS "memory_palaces_frogId_key" ON "memory_palaces" ("frogId");

-- Secondary indexes
CREATE INDEX IF NOT EXISTS "auth_nonces_walletAddress_createdAt_idx" ON "auth_nonces" ("walletAddress", "createdAt");
CREATE INDEX IF NOT EXISTS "auth_nonces_walletAddress_expiresAt_idx" ON "auth_nonces" ("walletAddress", "expiresAt");
CREATE INDEX IF NOT EXISTS "auth_nonces_walletAddress_usedAt_idx" ON "auth_nonces" ("walletAddress", "usedAt");
CREATE INDEX IF NOT EXISTS "human_verifications_walletAddress_action_idx" ON "human_verifications" ("walletAddress", "action");
CREATE INDEX IF NOT EXISTS "human_verifications_action_createdAt_idx" ON "human_verifications" ("action", "createdAt");
CREATE INDEX IF NOT EXISTS "egg_profiles_claimStatus_idx" ON "egg_profiles" ("claimStatus");
CREATE INDEX IF NOT EXISTS "pet_states_lifeStage_idx" ON "pet_states" ("lifeStage");
CREATE INDEX IF NOT EXISTS "relationship_events_frogId_occurredAt_idx" ON "relationship_events" ("frogId", "occurredAt");
CREATE INDEX IF NOT EXISTS "relationship_events_eventType_occurredAt_idx" ON "relationship_events" ("eventType", "occurredAt");
CREATE INDEX IF NOT EXISTS "rituals_frogId_ritualType_idx" ON "rituals" ("frogId", "ritualType");
CREATE INDEX IF NOT EXISTS "rituals_status_createdAt_idx" ON "rituals" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "rituals_targetFrogId_idx" ON "rituals" ("targetFrogId");
CREATE INDEX IF NOT EXISTS "onchain_milestones_frogId_milestoneType_createdAt_idx" ON "onchain_milestones" ("frogId", "milestoneType", "createdAt");
CREATE INDEX IF NOT EXISTS "onchain_milestones_travelId_idx" ON "onchain_milestones" ("travelId");
CREATE INDEX IF NOT EXISTS "domain_events_eventType_occurredAt_idx" ON "domain_events" ("eventType", "occurredAt");
CREATE INDEX IF NOT EXISTS "domain_events_frogId_occurredAt_idx" ON "domain_events" ("frogId", "occurredAt");
CREATE INDEX IF NOT EXISTS "domain_events_travelId_occurredAt_idx" ON "domain_events" ("travelId", "occurredAt");

-- Foreign keys
ALTER TABLE "egg_profiles"
  ADD CONSTRAINT "egg_profiles_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pet_states"
  ADD CONSTRAINT "pet_states_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "soul_profiles"
  ADD CONSTRAINT "soul_profiles_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "relationship_events"
  ADD CONSTRAINT "relationship_events_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "relationship_events"
  ADD CONSTRAINT "relationship_events_actorFrogId_fkey"
  FOREIGN KEY ("actorFrogId") REFERENCES "Frog"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "relationship_events"
  ADD CONSTRAINT "relationship_events_counterpartyFrogId_fkey"
  FOREIGN KEY ("counterpartyFrogId") REFERENCES "Frog"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rituals"
  ADD CONSTRAINT "rituals_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rituals"
  ADD CONSTRAINT "rituals_targetFrogId_fkey"
  FOREIGN KEY ("targetFrogId") REFERENCES "Frog"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "memory_palaces"
  ADD CONSTRAINT "memory_palaces_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "onchain_milestones"
  ADD CONSTRAINT "onchain_milestones_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "onchain_milestones"
  ADD CONSTRAINT "onchain_milestones_travelId_fkey"
  FOREIGN KEY ("travelId") REFERENCES "Travel"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "domain_events"
  ADD CONSTRAINT "domain_events_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "domain_events"
  ADD CONSTRAINT "domain_events_travelId_fkey"
  FOREIGN KEY ("travelId") REFERENCES "Travel"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
