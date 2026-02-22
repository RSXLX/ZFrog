-- CreateEnum
CREATE TYPE "CommunityCredentialType" AS ENUM ('PUBLIC', 'NFT', 'INVITE_CODE', 'SIGNATURE');

-- CreateEnum
CREATE TYPE "FoodType" AS ENUM ('fly', 'worm', 'cricket', 'butterfly', 'dragonfly', 'golden_fly');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BadgeUnlockType" ADD VALUE 'SOCIAL';
ALTER TYPE "BadgeUnlockType" ADD VALUE 'COLLECTION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChatIntent" ADD VALUE 'travel_stats';
ALTER TYPE "ChatIntent" ADD VALUE 'friend_list';
ALTER TYPE "ChatIntent" ADD VALUE 'friend_add';
ALTER TYPE "ChatIntent" ADD VALUE 'friend_visit';
ALTER TYPE "ChatIntent" ADD VALUE 'souvenirs_query';
ALTER TYPE "ChatIntent" ADD VALUE 'badges_query';
ALTER TYPE "ChatIntent" ADD VALUE 'garden_query';
ALTER TYPE "ChatIntent" ADD VALUE 'messages_query';
ALTER TYPE "ChatIntent" ADD VALUE 'navigate';

-- AlterTable
ALTER TABLE "Decoration" ADD COLUMN     "buffType" TEXT,
ADD COLUMN     "buffValue" DOUBLE PRECISION,
ADD COLUMN     "gridHeight" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "gridWidth" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "rarity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "weatherAnim" TEXT;

-- AlterTable
ALTER TABLE "Frog" ADD COLUMN     "appearanceDesc" TEXT,
ADD COLUMN     "appearanceParams" JSONB,
ADD COLUMN     "happiness" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "hunger" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "isHiddenEdition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastFedAt" TIMESTAMP(3),
ADD COLUMN     "lastInteractedAt" TIMESTAMP(3),
ADD COLUMN     "rarityScore" INTEGER,
ADD COLUMN     "rarityTier" TEXT;

-- AlterTable
ALTER TABLE "PlacedItem" ADD COLUMN     "gridX" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "gridY" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "state" TEXT NOT NULL DEFAULT 'normal',
ALTER COLUMN "x" DROP NOT NULL,
ALTER COLUMN "y" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RoomLayout" ADD COLUMN     "comfortScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "editLock" TEXT,
ADD COLUMN     "gridCols" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN     "gridRows" INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "Travel" ADD COLUMN     "refundAmount" TEXT;

-- CreateTable
CREATE TABLE "TravelFootprint" (
    "id" SERIAL NOT NULL,
    "travelId" INTEGER NOT NULL,
    "frogId" INTEGER NOT NULL,
    "chainId" INTEGER NOT NULL,
    "chainType" "ChainType" NOT NULL DEFAULT 'ZETACHAIN_ATHENS',
    "txHash" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelFootprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Community" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🏠',
    "themeColor" TEXT NOT NULL DEFAULT '#4CAF50',
    "description" TEXT,
    "credentialType" "CommunityCredentialType" NOT NULL DEFAULT 'PUBLIC',
    "credentialData" JSONB,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "creatorAddress" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCommunity" (
    "id" SERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "credential" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCommunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodInventory" (
    "id" SERIAL NOT NULL,
    "frogId" INTEGER NOT NULL,
    "foodType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTreasure" (
    "id" TEXT NOT NULL,
    "hostFrogId" INTEGER NOT NULL,
    "visitorId" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardId" TEXT,
    "rewardAmount" INTEGER NOT NULL DEFAULT 1,
    "foundAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTreasure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineBonus" (
    "id" TEXT NOT NULL,
    "frogId" INTEGER NOT NULL,
    "lastOnline" TIMESTAMP(3) NOT NULL,
    "offlineHours" INTEGER NOT NULL,
    "comfortScore" INTEGER NOT NULL,
    "bonusType" TEXT NOT NULL,
    "bonusValue" DOUBLE PRECISION NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflineBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelFootprint_travelId_idx" ON "TravelFootprint"("travelId");

-- CreateIndex
CREATE INDEX "TravelFootprint_frogId_idx" ON "TravelFootprint"("frogId");

-- CreateIndex
CREATE INDEX "TravelFootprint_walletAddress_idx" ON "TravelFootprint"("walletAddress");

-- CreateIndex
CREATE INDEX "Community_name_idx" ON "Community"("name");

-- CreateIndex
CREATE INDEX "Community_creatorAddress_idx" ON "Community"("creatorAddress");

-- CreateIndex
CREATE INDEX "Community_isActive_idx" ON "Community"("isActive");

-- CreateIndex
CREATE INDEX "UserCommunity_userAddress_idx" ON "UserCommunity"("userAddress");

-- CreateIndex
CREATE INDEX "UserCommunity_communityId_idx" ON "UserCommunity"("communityId");

-- CreateIndex
CREATE INDEX "UserCommunity_isActive_idx" ON "UserCommunity"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserCommunity_userAddress_communityId_key" ON "UserCommunity"("userAddress", "communityId");

-- CreateIndex
CREATE INDEX "FoodInventory_frogId_idx" ON "FoodInventory"("frogId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodInventory_frogId_foodType_key" ON "FoodInventory"("frogId", "foodType");

-- CreateIndex
CREATE INDEX "DailyTreasure_hostFrogId_idx" ON "DailyTreasure"("hostFrogId");

-- CreateIndex
CREATE INDEX "DailyTreasure_visitorId_idx" ON "DailyTreasure"("visitorId");

-- CreateIndex
CREATE INDEX "DailyTreasure_foundAt_idx" ON "DailyTreasure"("foundAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTreasure_hostFrogId_visitorId_foundAt_key" ON "DailyTreasure"("hostFrogId", "visitorId", "foundAt");

-- CreateIndex
CREATE INDEX "OfflineBonus_frogId_idx" ON "OfflineBonus"("frogId");

-- CreateIndex
CREATE INDEX "OfflineBonus_claimedAt_idx" ON "OfflineBonus"("claimedAt");

-- AddForeignKey
ALTER TABLE "TravelFootprint" ADD CONSTRAINT "TravelFootprint_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelFootprint" ADD CONSTRAINT "TravelFootprint_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCommunity" ADD CONSTRAINT "UserCommunity_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "Community"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodInventory" ADD CONSTRAINT "FoodInventory_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTreasure" ADD CONSTRAINT "DailyTreasure_hostFrogId_fkey" FOREIGN KEY ("hostFrogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTreasure" ADD CONSTRAINT "DailyTreasure_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineBonus" ADD CONSTRAINT "OfflineBonus_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
