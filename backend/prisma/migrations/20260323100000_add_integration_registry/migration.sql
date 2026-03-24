-- V3-W1-02 integration registry baseline
-- Created: 2026-03-23

CREATE TABLE IF NOT EXISTS "integration_apps" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "appType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_apps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_apps_slug_key"
  ON "integration_apps" ("slug");

CREATE INDEX IF NOT EXISTS "integration_apps_appType_status_idx"
  ON "integration_apps" ("appType", "status");

CREATE TABLE IF NOT EXISTS "integration_permissions" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "permission" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_permissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_permissions_appId_permission_key"
  ON "integration_permissions" ("appId", "permission");

CREATE INDEX IF NOT EXISTS "integration_permissions_permission_idx"
  ON "integration_permissions" ("permission");

ALTER TABLE "integration_permissions"
  ADD CONSTRAINT "integration_permissions_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "integration_apps"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "integration_keys" (
  "id" TEXT NOT NULL,
  "appId" TEXT NOT NULL,
  "label" TEXT,
  "keyPrefix" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "issuedBy" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "integration_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "integration_keys_keyPrefix_key"
  ON "integration_keys" ("keyPrefix");

CREATE INDEX IF NOT EXISTS "integration_keys_appId_status_idx"
  ON "integration_keys" ("appId", "status");

CREATE INDEX IF NOT EXISTS "integration_keys_expiresAt_idx"
  ON "integration_keys" ("expiresAt");

ALTER TABLE "integration_keys"
  ADD CONSTRAINT "integration_keys_appId_fkey"
  FOREIGN KEY ("appId") REFERENCES "integration_apps"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
