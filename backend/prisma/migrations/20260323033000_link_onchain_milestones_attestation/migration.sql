-- V2-W5-02 attestation onchain trace link
-- Created: 2026-03-23

ALTER TABLE "onchain_milestones"
  ADD COLUMN "attestationId" TEXT;

CREATE INDEX IF NOT EXISTS "onchain_milestones_attestationId_createdAt_idx"
  ON "onchain_milestones" ("attestationId", "createdAt");

ALTER TABLE "onchain_milestones"
  ADD CONSTRAINT "onchain_milestones_attestationId_fkey"
  FOREIGN KEY ("attestationId") REFERENCES "relationship_attestations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
