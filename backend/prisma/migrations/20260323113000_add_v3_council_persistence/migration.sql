-- V3-W5-01 council persistence + trace archive baseline
-- Created: 2026-03-23

CREATE TABLE IF NOT EXISTS "council_runs" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "keyId" TEXT NOT NULL,
  "requestedByActor" TEXT NOT NULL,
  "requestId" TEXT,
  "focus" TEXT NOT NULL,
  "objective" TEXT,
  "rationale" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "dataSources" JSONB NOT NULL,
  "suggestedActions" JSONB NOT NULL,
  "traceId" TEXT NOT NULL,
  "promptKitVersion" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "council_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "council_runs_traceId_key"
  ON "council_runs" ("traceId");

CREATE INDEX IF NOT EXISTS "council_runs_appId_createdAt_idx"
  ON "council_runs" ("appId", "createdAt");

CREATE TABLE IF NOT EXISTS "council_suggestions" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "focus" TEXT NOT NULL,
  "objective" TEXT,
  "rationale" TEXT NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "riskReason" TEXT NOT NULL,
  "dataSources" JSONB NOT NULL,
  "suggestedActions" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdByAppId" TEXT NOT NULL,
  "createdByKeyId" TEXT NOT NULL,
  "createdByActor" TEXT NOT NULL,
  "requestId" TEXT,
  "updatedByActor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "council_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "council_suggestions_runId_key"
  ON "council_suggestions" ("runId");

CREATE INDEX IF NOT EXISTS "council_suggestions_createdByAppId_status_createdAt_idx"
  ON "council_suggestions" ("createdByAppId", "status", "createdAt");

ALTER TABLE "council_suggestions"
  ADD CONSTRAINT "council_suggestions_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "council_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "council_responses" (
  "id" TEXT NOT NULL,
  "suggestionId" TEXT NOT NULL,
  "decision" TEXT NOT NULL,
  "note" TEXT,
  "respondedByAppId" TEXT NOT NULL,
  "respondedByActor" TEXT NOT NULL,
  "respondedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "council_responses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "council_responses_suggestionId_key"
  ON "council_responses" ("suggestionId");

CREATE INDEX IF NOT EXISTS "council_responses_respondedByAppId_respondedAt_idx"
  ON "council_responses" ("respondedByAppId", "respondedAt");

ALTER TABLE "council_responses"
  ADD CONSTRAINT "council_responses_suggestionId_fkey"
  FOREIGN KEY ("suggestionId") REFERENCES "council_suggestions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
