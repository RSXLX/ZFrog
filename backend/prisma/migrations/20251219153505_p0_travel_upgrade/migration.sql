-- CreateEnum
CREATE TYPE "FrogStatus" AS ENUM ('Idle', 'Traveling', 'Returning');

-- CreateEnum
CREATE TYPE "TravelStatus" AS ENUM ('Active', 'Processing', 'Completed', 'Cancelled', 'Failed');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary');

-- CreateEnum
CREATE TYPE "ImageGenerationStatus" AS ENUM ('PENDING', 'GENERATING', 'PROCESSING', 'UPLOADING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('Pending', 'Accepted', 'Declined', 'Blocked');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('Visit', 'Feed', 'Play', 'Gift', 'Message', 'Travel');

-- CreateEnum
CREATE TYPE "DiaryMood" AS ENUM ('HAPPY', 'CURIOUS', 'SURPRISED', 'PEACEFUL', 'EXCITED', 'SLEEPY');

-- CreateEnum
CREATE TYPE "BadgeUnlockType" AS ENUM ('TRIP_COUNT', 'CHAIN_VISIT', 'MULTI_CHAIN', 'RARE_FIND', 'SPECIAL');

-- CreateTable
CREATE TABLE "Frog" (
    "id" SERIAL NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "totalTravels" INTEGER NOT NULL DEFAULT 0,
    "status" "FrogStatus" NOT NULL DEFAULT 'Idle',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Frog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Travel" (
    "id" SERIAL NOT NULL,
    "frogId" INTEGER NOT NULL,
    "targetWallet" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 1,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "TravelStatus" NOT NULL DEFAULT 'Active',
    "observedTxCount" INTEGER,
    "observedTotalValue" TEXT,
    "journalHash" TEXT,
    "journalContent" TEXT,
    "souvenirId" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "exploredBlock" BIGINT,
    "exploredTimestamp" TIMESTAMP(3),
    "exploredSnapshot" JSONB,
    "diary" TEXT,
    "diaryMood" "DiaryMood",
    "souvenirData" JSONB,

    CONSTRAINT "Travel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Souvenir" (
    "id" SERIAL NOT NULL,
    "tokenId" INTEGER NOT NULL,
    "frogId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "Rarity" NOT NULL,
    "metadataUri" TEXT,
    "mintedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Souvenir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletObservation" (
    "id" SERIAL NOT NULL,
    "travelId" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "transactions" JSONB NOT NULL,
    "totalTxCount" INTEGER NOT NULL,
    "totalValueWei" TEXT NOT NULL,
    "notableEvents" JSONB,
    "observedFrom" TIMESTAMP(3) NOT NULL,
    "observedTo" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SouvenirImage" (
    "id" TEXT NOT NULL,
    "odosId" TEXT NOT NULL,
    "travelId" TEXT NOT NULL,
    "souvenirId" TEXT NOT NULL,
    "souvenirType" TEXT NOT NULL,
    "souvenirName" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "chainId" INTEGER,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "actualPrompt" TEXT,
    "imageUrl" TEXT,
    "ipfsHash" TEXT,
    "ipfsUrl" TEXT,
    "gatewayUrl" TEXT,
    "fileSize" INTEGER,
    "seed" INTEGER NOT NULL,
    "stylePreset" TEXT,
    "status" "ImageGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "generatedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SouvenirImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" SERIAL NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "addresseeId" INTEGER NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'Pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FriendInteraction" (
    "id" SERIAL NOT NULL,
    "friendshipId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "type" "InteractionType" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TravelBadge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "unlockType" "BadgeUnlockType" NOT NULL,
    "unlockCondition" JSONB NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 1,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "frogId" INTEGER NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedByTravelId" INTEGER,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrogTravelStats" (
    "id" TEXT NOT NULL,
    "frogId" INTEGER NOT NULL,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "bscTrips" INTEGER NOT NULL DEFAULT 0,
    "ethTrips" INTEGER NOT NULL DEFAULT 0,
    "zetaTrips" INTEGER NOT NULL DEFAULT 0,
    "totalDiscoveries" INTEGER NOT NULL DEFAULT 0,
    "rareFinds" INTEGER NOT NULL DEFAULT 0,
    "earliestBlockVisited" BIGINT,
    "oldestDateVisited" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrogTravelStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Frog_tokenId_key" ON "Frog"("tokenId");

-- CreateIndex
CREATE INDEX "Frog_ownerAddress_idx" ON "Frog"("ownerAddress");

-- CreateIndex
CREATE INDEX "Travel_frogId_idx" ON "Travel"("frogId");

-- CreateIndex
CREATE INDEX "Travel_status_idx" ON "Travel"("status");

-- CreateIndex
CREATE INDEX "Travel_endTime_idx" ON "Travel"("endTime");

-- CreateIndex
CREATE INDEX "Travel_exploredBlock_idx" ON "Travel"("exploredBlock");

-- CreateIndex
CREATE UNIQUE INDEX "Souvenir_tokenId_key" ON "Souvenir"("tokenId");

-- CreateIndex
CREATE INDEX "Souvenir_frogId_idx" ON "Souvenir"("frogId");

-- CreateIndex
CREATE INDEX "WalletObservation_travelId_idx" ON "WalletObservation"("travelId");

-- CreateIndex
CREATE INDEX "WalletObservation_walletAddress_idx" ON "WalletObservation"("walletAddress");

-- CreateIndex
CREATE INDEX "SouvenirImage_odosId_idx" ON "SouvenirImage"("odosId");

-- CreateIndex
CREATE INDEX "SouvenirImage_souvenirId_idx" ON "SouvenirImage"("souvenirId");

-- CreateIndex
CREATE INDEX "SouvenirImage_status_idx" ON "SouvenirImage"("status");

-- CreateIndex
CREATE INDEX "Friendship_status_idx" ON "Friendship"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_requesterId_addresseeId_key" ON "Friendship"("requesterId", "addresseeId");

-- CreateIndex
CREATE INDEX "FriendInteraction_friendshipId_idx" ON "FriendInteraction"("friendshipId");

-- CreateIndex
CREATE INDEX "FriendInteraction_actorId_idx" ON "FriendInteraction"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "TravelBadge_code_key" ON "TravelBadge"("code");

-- CreateIndex
CREATE INDEX "UserBadge_frogId_idx" ON "UserBadge"("frogId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_frogId_badgeId_key" ON "UserBadge"("frogId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "FrogTravelStats_frogId_key" ON "FrogTravelStats"("frogId");

-- CreateIndex
CREATE INDEX "FrogTravelStats_frogId_idx" ON "FrogTravelStats"("frogId");

-- AddForeignKey
ALTER TABLE "Travel" ADD CONSTRAINT "Travel_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Travel" ADD CONSTRAINT "Travel_souvenirId_fkey" FOREIGN KEY ("souvenirId") REFERENCES "Souvenir"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Souvenir" ADD CONSTRAINT "Souvenir_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletObservation" ADD CONSTRAINT "WalletObservation_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendInteraction" ADD CONSTRAINT "FriendInteraction_friendshipId_fkey" FOREIGN KEY ("friendshipId") REFERENCES "Friendship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendInteraction" ADD CONSTRAINT "FriendInteraction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "TravelBadge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrogTravelStats" ADD CONSTRAINT "FrogTravelStats_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
