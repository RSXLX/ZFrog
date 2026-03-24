-- V2-W6-03 memory summary snapshots
-- Created: 2026-03-23

CREATE TABLE IF NOT EXISTS "memory_summaries" (
  "id" SERIAL NOT NULL,
  "frogId" INTEGER NOT NULL,
  "summaryType" TEXT NOT NULL DEFAULT 'RELATIONSHIP_V1',
  "summaryText" TEXT NOT NULL,
  "sourceData" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "memory_summaries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "memory_summaries_frogId_summaryType_key"
  ON "memory_summaries" ("frogId", "summaryType");

CREATE INDEX IF NOT EXISTS "memory_summaries_summaryType_generatedAt_idx"
  ON "memory_summaries" ("summaryType", "generatedAt");

ALTER TABLE "memory_summaries"
  ADD CONSTRAINT "memory_summaries_frogId_fkey"
  FOREIGN KEY ("frogId") REFERENCES "Frog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
