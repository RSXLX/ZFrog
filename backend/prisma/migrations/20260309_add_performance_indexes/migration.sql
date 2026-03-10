-- Performance optimization indexes
-- Created: 2026-03-09
-- Purpose: Add indexes for frequently queried fields to improve query performance

-- Travel table indexes
CREATE INDEX IF NOT EXISTS "idx_travel_frogId" ON "Travel"("frogId");
CREATE INDEX IF NOT EXISTS "idx_travel_status" ON "Travel"("status");
CREATE INDEX IF NOT EXISTS "idx_travel_createdAt" ON "Travel"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_travel_frogId_status" ON "Travel"("frogId", "status");

-- Frog table indexes
CREATE INDEX IF NOT EXISTS "idx_frog_owner" ON "Frog"("ownerAddress");
CREATE INDEX IF NOT EXISTS "idx_frog_status" ON "Frog"("status");
CREATE INDEX IF NOT EXISTS "idx_frog_level" ON "Frog"("level" DESC);
CREATE INDEX IF NOT EXISTS "idx_frog_owner_status" ON "Frog"("ownerAddress", "status");

-- User table indexes
CREATE INDEX IF NOT EXISTS "idx_user_wallet" ON "User"("walletAddress");
CREATE INDEX IF NOT EXISTS "idx_user_createdAt" ON "User"("createdAt" DESC);

-- Transaction table indexes
CREATE INDEX IF NOT EXISTS "idx_transaction_frogId" ON "Transaction"("frogId");
CREATE INDEX IF NOT EXISTS "idx_transaction_type" ON "Transaction"("type");
CREATE INDEX IF NOT EXISTS "idx_transaction_timestamp" ON "Transaction"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "idx_transaction_frogId_type" ON "Transaction"("frogId", "type");

-- Add comment for documentation
COMMENT ON INDEX "idx_travel_frogId" IS 'Optimize queries filtering by frog ID';
COMMENT ON INDEX "idx_travel_status" IS 'Optimize queries filtering by travel status';
COMMENT ON INDEX "idx_frog_owner" IS 'Optimize queries filtering by owner address';
COMMENT ON INDEX "idx_transaction_type" IS 'Optimize queries filtering by transaction type';