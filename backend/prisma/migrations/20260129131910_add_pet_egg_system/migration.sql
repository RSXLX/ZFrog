/*
  Warnings:

  - A unique constraint covering the columns `[crossChainMessageId]` on the table `GroupTravel` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LilyTxType" AS ENUM ('GAME_REWARD', 'FEED_COST', 'CLEAN_REWARD', 'DAILY_SIGNIN', 'TRAVEL_REWARD', 'MEDICINE_COST');

-- AlterTable
ALTER TABLE "Frog" ADD COLUMN     "canEvolve" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cleanliness" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "energy" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "evolutionType" TEXT,
ADD COLUMN     "evolvedAt" TIMESTAMP(3),
ADD COLUMN     "health" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "isSick" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastStatusUpdate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "needsClean" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sickSince" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "GroupTravel" ADD COLUMN     "crossChainMessageId" TEXT,
ADD COLUMN     "isCrossChain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "provisionsUsed" TEXT,
ADD COLUMN     "targetChainId" INTEGER;

-- CreateTable
CREATE TABLE "LilyBalance" (
    "id" SERIAL NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dailyGameEarned" INTEGER NOT NULL DEFAULT 0,
    "dailyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LilyBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LilyTransaction" (
    "id" SERIAL NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "LilyTxType" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LilyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LilyBalance_ownerAddress_key" ON "LilyBalance"("ownerAddress");

-- CreateIndex
CREATE INDEX "LilyBalance_ownerAddress_idx" ON "LilyBalance"("ownerAddress");

-- CreateIndex
CREATE INDEX "LilyTransaction_ownerAddress_idx" ON "LilyTransaction"("ownerAddress");

-- CreateIndex
CREATE INDEX "LilyTransaction_type_idx" ON "LilyTransaction"("type");

-- CreateIndex
CREATE INDEX "LilyTransaction_createdAt_idx" ON "LilyTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTravel_crossChainMessageId_key" ON "GroupTravel"("crossChainMessageId");

-- CreateIndex
CREATE INDEX "GroupTravel_crossChainMessageId_idx" ON "GroupTravel"("crossChainMessageId");
