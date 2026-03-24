-- V2-W5-01 relationship attestation storage
-- Created: 2026-03-23

CREATE TABLE IF NOT EXISTS "relationship_attestations" (
  "id" TEXT NOT NULL,
  "subjectFrogId" INTEGER NOT NULL,
  "objectFrogId" INTEGER NOT NULL,
  "attestationType" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "evidence" JSONB,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "idempotencyKey" TEXT,
  "requestId" TEXT,
  "createdByAddress" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "relationship_attestations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "relationship_attestations_idempotencyKey_key"
  ON "relationship_attestations" ("idempotencyKey");

CREATE UNIQUE INDEX IF NOT EXISTS "relationship_attestations_subject_object_type_source_key"
  ON "relationship_attestations" ("subjectFrogId", "objectFrogId", "attestationType", "source");

CREATE INDEX IF NOT EXISTS "relationship_attestations_subjectFrogId_createdAt_idx"
  ON "relationship_attestations" ("subjectFrogId", "createdAt");

CREATE INDEX IF NOT EXISTS "relationship_attestations_objectFrogId_createdAt_idx"
  ON "relationship_attestations" ("objectFrogId", "createdAt");

CREATE INDEX IF NOT EXISTS "relationship_attestations_attestationType_createdAt_idx"
  ON "relationship_attestations" ("attestationType", "createdAt");

CREATE INDEX IF NOT EXISTS "relationship_attestations_status_createdAt_idx"
  ON "relationship_attestations" ("status", "createdAt");

ALTER TABLE "relationship_attestations"
  ADD CONSTRAINT "relationship_attestations_subjectFrogId_fkey"
  FOREIGN KEY ("subjectFrogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "relationship_attestations"
  ADD CONSTRAINT "relationship_attestations_objectFrogId_fkey"
  FOREIGN KEY ("objectFrogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
