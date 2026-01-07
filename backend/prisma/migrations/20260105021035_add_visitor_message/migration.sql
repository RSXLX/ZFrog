-- CreateEnum
CREATE TYPE "DiscoveryType" AS ENUM ('balance', 'activity', 'timing', 'fun_fact', 'cross_chain', 'token_holding', 'tx_action', 'gas_price');

-- CreateEnum
CREATE TYPE "CrossChainStatus" AS ENUM ('LOCKING', 'LOCKED', 'CROSSING_OUT', 'ON_TARGET_CHAIN', 'CROSSING_BACK', 'UNLOCKING', 'COMPLETED', 'TIMEOUT', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('OUT', 'BACK');

-- CreateEnum
CREATE TYPE "CrossChainMessageStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'TIMEOUT');

-- AlterEnum
ALTER TYPE "FrogStatus" ADD VALUE 'CrossChainLocked';

-- AlterTable
ALTER TABLE "FriendInteraction" ADD COLUMN     "likesCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Travel" ADD COLUMN     "crossChainMessageId" TEXT,
ADD COLUMN     "crossChainStatus" "CrossChainStatus",
ADD COLUMN     "crossChainXpEarned" INTEGER,
ADD COLUMN     "isCrossChain" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lockTxHash" TEXT,
ADD COLUMN     "returnMessageId" TEXT,
ADD COLUMN     "targetChainActions" JSONB,
ADD COLUMN     "targetChainArrivalTime" TIMESTAMP(3),
ADD COLUMN     "unlockTxHash" TEXT;

-- CreateTable
CREATE TABLE "TravelDiscovery" (
    "id" SERIAL NOT NULL,
    "travelId" INTEGER NOT NULL,
    "type" "DiscoveryType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 1,
    "blockNumber" BIGINT,
    "chainType" "ChainType" NOT NULL DEFAULT 'ZETACHAIN_ATHENS',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelInteraction" (
    "id" SERIAL NOT NULL,
    "travelId" INTEGER NOT NULL,
    "chainId" INTEGER NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "message" TEXT NOT NULL,
    "exploredAddress" TEXT,
    "isContract" BOOLEAN NOT NULL DEFAULT false,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarnedTravelBadge" (
    "id" SERIAL NOT NULL,
    "frogId" INTEGER NOT NULL,
    "badgeType" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "EarnedTravelBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrossChainMessage" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "sourceChain" "ChainType" NOT NULL,
    "targetChain" "ChainType" NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "status" "CrossChainMessageStatus" NOT NULL,
    "sendTxHash" TEXT,
    "receiveTxHash" TEXT,
    "payload" JSONB NOT NULL,
    "gasUsed" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrossChainMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitorMessage" (
    "id" SERIAL NOT NULL,
    "fromFrogId" INTEGER NOT NULL,
    "toAddress" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "travelId" INTEGER,
    "emoji" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelDiscovery_travelId_idx" ON "TravelDiscovery"("travelId");

-- CreateIndex
CREATE INDEX "TravelDiscovery_type_idx" ON "TravelDiscovery"("type");

-- CreateIndex
CREATE INDEX "TravelDiscovery_rarity_idx" ON "TravelDiscovery"("rarity");

-- CreateIndex
CREATE INDEX "TravelInteraction_travelId_idx" ON "TravelInteraction"("travelId");

-- CreateIndex
CREATE INDEX "TravelInteraction_chainId_blockNumber_idx" ON "TravelInteraction"("chainId", "blockNumber");

-- CreateIndex
CREATE INDEX "EarnedTravelBadge_frogId_idx" ON "EarnedTravelBadge"("frogId");

-- CreateIndex
CREATE INDEX "EarnedTravelBadge_badgeType_idx" ON "EarnedTravelBadge"("badgeType");

-- CreateIndex
CREATE UNIQUE INDEX "EarnedTravelBadge_frogId_badgeType_key" ON "EarnedTravelBadge"("frogId", "badgeType");

-- CreateIndex
CREATE UNIQUE INDEX "CrossChainMessage_messageId_key" ON "CrossChainMessage"("messageId");

-- CreateIndex
CREATE INDEX "CrossChainMessage_tokenId_idx" ON "CrossChainMessage"("tokenId");

-- CreateIndex
CREATE INDEX "CrossChainMessage_status_idx" ON "CrossChainMessage"("status");

-- CreateIndex
CREATE INDEX "CrossChainMessage_messageId_idx" ON "CrossChainMessage"("messageId");

-- CreateIndex
CREATE INDEX "VisitorMessage_toAddress_idx" ON "VisitorMessage"("toAddress");

-- CreateIndex
CREATE INDEX "VisitorMessage_fromFrogId_idx" ON "VisitorMessage"("fromFrogId");

-- CreateIndex
CREATE INDEX "VisitorMessage_isRead_idx" ON "VisitorMessage"("isRead");

-- AddForeignKey
ALTER TABLE "TravelDiscovery" ADD CONSTRAINT "TravelDiscovery_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelInteraction" ADD CONSTRAINT "TravelInteraction_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarnedTravelBadge" ADD CONSTRAINT "EarnedTravelBadge_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorMessage" ADD CONSTRAINT "VisitorMessage_fromFrogId_fkey" FOREIGN KEY ("fromFrogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitorMessage" ADD CONSTRAINT "VisitorMessage_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
