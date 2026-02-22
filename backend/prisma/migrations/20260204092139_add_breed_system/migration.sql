-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('FOOD', 'MEDICINE', 'BOOST', 'DECORATION', 'SPECIAL');

-- CreateEnum
CREATE TYPE "BreedStatus" AS ENUM ('Pending', 'Accepted', 'Paid', 'Completed', 'Rejected', 'Cancelled', 'Expired');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LilyTxType" ADD VALUE 'TASK_REWARD';
ALTER TYPE "LilyTxType" ADD VALUE 'SHOP_PURCHASE';

-- AlterTable
ALTER TABLE "Friendship" ADD COLUMN     "intimacy" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "intimacyLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastInteraction" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Frog" ADD COLUMN     "breedCooldownUntil" TIMESTAMP(3),
ADD COLUMN     "generation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isResting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentFrogId1" INTEGER,
ADD COLUMN     "parentFrogId2" INTEGER,
ADD COLUMN     "restingSince" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DailyFriendInteraction" (
    "id" SERIAL NOT NULL,
    "friendshipId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "feedCount" INTEGER NOT NULL DEFAULT 0,
    "playCount" INTEGER NOT NULL DEFAULT 0,
    "giftCount" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "travelCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyFriendInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "frogId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyTask" (
    "id" SERIAL NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "loginTime" TIMESTAMP(3),
    "feedCount" INTEGER NOT NULL DEFAULT 0,
    "cleanCount" INTEGER NOT NULL DEFAULT 0,
    "gameCount" INTEGER NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "healthKept" BOOLEAN NOT NULL DEFAULT true,
    "claimedTasks" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ShopCategory" NOT NULL,
    "priceLily" INTEGER NOT NULL DEFAULT 0,
    "priceZeta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effect" TEXT,
    "effectValue" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isLimited" BOOLEAN NOT NULL DEFAULT false,
    "stockLimit" INTEGER,
    "requiredLevel" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreedRequest" (
    "id" SERIAL NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "partnerId" INTEGER NOT NULL,
    "status" "BreedStatus" NOT NULL DEFAULT 'Pending',
    "requesterPaid" BOOLEAN NOT NULL DEFAULT false,
    "partnerPaid" BOOLEAN NOT NULL DEFAULT false,
    "breedFee" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "offspringId" INTEGER,
    "offspringGenes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BreedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyFriendInteraction_friendshipId_idx" ON "DailyFriendInteraction"("friendshipId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyFriendInteraction_friendshipId_date_key" ON "DailyFriendInteraction"("friendshipId", "date");

-- CreateIndex
CREATE INDEX "Notification_frogId_isRead_idx" ON "Notification"("frogId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "DailyTask_ownerAddress_idx" ON "DailyTask"("ownerAddress");

-- CreateIndex
CREATE INDEX "DailyTask_date_idx" ON "DailyTask"("date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTask_ownerAddress_date_key" ON "DailyTask"("ownerAddress", "date");

-- CreateIndex
CREATE INDEX "ShopItem_category_idx" ON "ShopItem"("category");

-- CreateIndex
CREATE INDEX "ShopItem_isActive_idx" ON "ShopItem"("isActive");

-- CreateIndex
CREATE INDEX "BreedRequest_status_idx" ON "BreedRequest"("status");

-- CreateIndex
CREATE INDEX "BreedRequest_requesterId_idx" ON "BreedRequest"("requesterId");

-- CreateIndex
CREATE INDEX "BreedRequest_partnerId_idx" ON "BreedRequest"("partnerId");

-- CreateIndex
CREATE UNIQUE INDEX "BreedRequest_requesterId_partnerId_status_key" ON "BreedRequest"("requesterId", "partnerId", "status");

-- CreateIndex
CREATE INDEX "Friendship_intimacyLevel_idx" ON "Friendship"("intimacyLevel");

-- AddForeignKey
ALTER TABLE "DailyFriendInteraction" ADD CONSTRAINT "DailyFriendInteraction_friendshipId_fkey" FOREIGN KEY ("friendshipId") REFERENCES "Friendship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedRequest" ADD CONSTRAINT "BreedRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedRequest" ADD CONSTRAINT "BreedRequest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreedRequest" ADD CONSTRAINT "BreedRequest_offspringId_fkey" FOREIGN KEY ("offspringId") REFERENCES "Frog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
