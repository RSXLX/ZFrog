-- CreateEnum
CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "TravelBadge" ADD COLUMN     "airdropAmount" TEXT,
ADD COLUMN     "airdropEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "BadgeReward" (
    "id" TEXT NOT NULL,
    "userBadgeId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "status" "RewardStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "claimedAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BadgeReward_userBadgeId_key" ON "BadgeReward"("userBadgeId");

-- CreateIndex
CREATE INDEX "BadgeReward_ownerAddress_idx" ON "BadgeReward"("ownerAddress");

-- CreateIndex
CREATE INDEX "BadgeReward_status_idx" ON "BadgeReward"("status");

-- AddForeignKey
ALTER TABLE "BadgeReward" ADD CONSTRAINT "BadgeReward_userBadgeId_fkey" FOREIGN KEY ("userBadgeId") REFERENCES "UserBadge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
