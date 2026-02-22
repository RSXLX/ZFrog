-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TravelStage" ADD VALUE 'INTERACTING';
ALTER TYPE "TravelStage" ADD VALUE 'STRANDED';

-- AlterTable
ALTER TABLE "Friendship" ADD COLUMN     "affinityLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "groupTravelCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastTravelTogether" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Frog" ADD COLUMN     "luckyBuff" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "luckyBuffExpiry" TIMESTAMP(3),
ADD COLUMN     "snackPreference" TEXT;

-- AlterTable
ALTER TABLE "Souvenir" ADD COLUMN     "isDoubleFrog" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "materialType" TEXT,
ADD COLUMN     "partnerFrogId" INTEGER;

-- CreateTable
CREATE TABLE "TravelFeed" (
    "id" SERIAL NOT NULL,
    "travelId" INTEGER NOT NULL,
    "feederId" INTEGER NOT NULL,
    "feedType" TEXT NOT NULL DEFAULT 'energy',
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "pointsCost" INTEGER NOT NULL DEFAULT 10,
    "timeReduced" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressDiscovery" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "discovererFrogId" INTEGER NOT NULL,
    "isGoldLabel" BOOLEAN NOT NULL DEFAULT false,
    "addressType" TEXT,
    "protocolName" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AddressDiscovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RescueRequest" (
    "id" SERIAL NOT NULL,
    "travelId" INTEGER NOT NULL,
    "strandedFrogId" INTEGER NOT NULL,
    "chainId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publicAt" TIMESTAMP(3),
    "rescuedAt" TIMESTAMP(3),
    "rescuerId" INTEGER,
    "rescuerType" TEXT,
    "originalEarnings" INTEGER,
    "rescuerShare" INTEGER,
    "rescuerReputation" INTEGER,

    CONSTRAINT "RescueRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelFeed_travelId_idx" ON "TravelFeed"("travelId");

-- CreateIndex
CREATE INDEX "TravelFeed_feederId_idx" ON "TravelFeed"("feederId");

-- CreateIndex
CREATE INDEX "AddressDiscovery_discovererFrogId_idx" ON "AddressDiscovery"("discovererFrogId");

-- CreateIndex
CREATE INDEX "AddressDiscovery_isGoldLabel_idx" ON "AddressDiscovery"("isGoldLabel");

-- CreateIndex
CREATE UNIQUE INDEX "AddressDiscovery_address_chainId_key" ON "AddressDiscovery"("address", "chainId");

-- CreateIndex
CREATE UNIQUE INDEX "RescueRequest_travelId_key" ON "RescueRequest"("travelId");

-- CreateIndex
CREATE INDEX "RescueRequest_status_idx" ON "RescueRequest"("status");

-- CreateIndex
CREATE INDEX "RescueRequest_strandedFrogId_idx" ON "RescueRequest"("strandedFrogId");

-- CreateIndex
CREATE INDEX "RescueRequest_rescuerId_idx" ON "RescueRequest"("rescuerId");

-- CreateIndex
CREATE INDEX "Friendship_affinityLevel_idx" ON "Friendship"("affinityLevel");

-- CreateIndex
CREATE INDEX "Souvenir_materialType_idx" ON "Souvenir"("materialType");

-- AddForeignKey
ALTER TABLE "TravelFeed" ADD CONSTRAINT "TravelFeed_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TravelFeed" ADD CONSTRAINT "TravelFeed_feederId_fkey" FOREIGN KEY ("feederId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AddressDiscovery" ADD CONSTRAINT "AddressDiscovery_discovererFrogId_fkey" FOREIGN KEY ("discovererFrogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueRequest" ADD CONSTRAINT "RescueRequest_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueRequest" ADD CONSTRAINT "RescueRequest_strandedFrogId_fkey" FOREIGN KEY ("strandedFrogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RescueRequest" ADD CONSTRAINT "RescueRequest_rescuerId_fkey" FOREIGN KEY ("rescuerId") REFERENCES "Frog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
