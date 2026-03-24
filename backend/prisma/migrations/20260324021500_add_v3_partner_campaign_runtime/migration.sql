-- V3-W10-01 partner campaign runtime persistence
-- Created: 2026-03-24

CREATE TABLE IF NOT EXISTS "partner_campaigns" (
  "id" TEXT NOT NULL,
  "partnerAppId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "callbackEndpoint" TEXT NOT NULL,
  "callbackSecret" TEXT NOT NULL,
  "callbackSecretHash" TEXT NOT NULL,
  "rewardPolicy" JSONB,
  "metadata" JSONB,
  "createdByKeyId" TEXT NOT NULL,
  "createdByActor" TEXT NOT NULL,
  "requestId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_campaigns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_campaigns_partnerAppId_slug_key"
  ON "partner_campaigns" ("partnerAppId", "slug");

CREATE INDEX IF NOT EXISTS "partner_campaigns_partnerAppId_status_createdAt_idx"
  ON "partner_campaigns" ("partnerAppId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "partner_campaigns_status_createdAt_idx"
  ON "partner_campaigns" ("status", "createdAt");

CREATE TABLE IF NOT EXISTS "partner_callbacks" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "partnerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "signatureVersion" TEXT NOT NULL DEFAULT 'v1-hmac-sha256',
  "signature" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "status" TEXT NOT NULL DEFAULT 'REJECTED',
  "reason" TEXT,
  "payload" JSONB NOT NULL,
  "requestId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_callbacks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_callbacks_campaignId_partnerEventId_key"
  ON "partner_callbacks" ("campaignId", "partnerEventId");

CREATE INDEX IF NOT EXISTS "partner_callbacks_campaignId_receivedAt_idx"
  ON "partner_callbacks" ("campaignId", "receivedAt");

CREATE INDEX IF NOT EXISTS "partner_callbacks_status_receivedAt_idx"
  ON "partner_callbacks" ("status", "receivedAt");

ALTER TABLE "partner_callbacks"
  ADD CONSTRAINT "partner_callbacks_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "partner_campaigns"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "partner_rewards" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "callbackId" TEXT NOT NULL,
  "recipientWallet" TEXT NOT NULL,
  "rewardType" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'GRANTED',
  "metadata" JSONB,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "partner_rewards_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "partner_rewards_callbackId_key"
  ON "partner_rewards" ("callbackId");

CREATE INDEX IF NOT EXISTS "partner_rewards_campaignId_createdAt_idx"
  ON "partner_rewards" ("campaignId", "createdAt");

CREATE INDEX IF NOT EXISTS "partner_rewards_recipientWallet_createdAt_idx"
  ON "partner_rewards" ("recipientWallet", "createdAt");

ALTER TABLE "partner_rewards"
  ADD CONSTRAINT "partner_rewards_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "partner_campaigns"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "partner_rewards"
  ADD CONSTRAINT "partner_rewards_callbackId_fkey"
  FOREIGN KEY ("callbackId") REFERENCES "partner_callbacks"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
