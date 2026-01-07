-- CreateEnum
CREATE TYPE "DecorationType" AS ENUM ('FURNITURE', 'PLANT', 'FLOORING', 'WALLPAPER', 'SOUVENIR_DISPLAY');

-- CreateEnum
CREATE TYPE "GiftType" AS ENUM ('ITEM', 'NFT', 'TOKEN', 'DECORATION');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('TRAVEL', 'SOCIAL', 'COLLECTION', 'DECORATION');

-- AlterTable
ALTER TABLE "VisitorMessage" ADD COLUMN     "likedBy" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "likesCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "signature" TEXT,
ADD COLUMN     "tipAmount" TEXT,
ADD COLUMN     "tipTxHash" TEXT;

-- CreateTable
CREATE TABLE "Decoration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DecorationType" NOT NULL,
    "assetUrl" TEXT NOT NULL,
    "layer" INTEGER NOT NULL DEFAULT 0,
    "isInteractive" BOOLEAN NOT NULL DEFAULT false,
    "width" INTEGER NOT NULL DEFAULT 64,
    "height" INTEGER NOT NULL DEFAULT 64,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decoration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDecoration" (
    "id" TEXT NOT NULL,
    "frogId" INTEGER NOT NULL,
    "decorationId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "souvenirId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDecoration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomLayout" (
    "id" TEXT NOT NULL,
    "frogId" INTEGER NOT NULL,
    "sceneType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacedItem" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "userDecorationId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rotation" INTEGER NOT NULL DEFAULT 0,
    "zIndex" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlacedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomLayoutSnapshot" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomLayoutSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toFrogId" INTEGER NOT NULL,
    "giftType" "GiftType" NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemImageUrl" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "nftContract" TEXT,
    "nftTokenId" TEXT,
    "txHash" TEXT,
    "isOpened" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "frogId" INTEGER NOT NULL,
    "travelId" INTEGER,
    "imageUrl" TEXT NOT NULL,
    "ipfsHash" TEXT,
    "ipfsUrl" TEXT,
    "isNft" BOOLEAN NOT NULL DEFAULT false,
    "nftContract" TEXT,
    "nftTokenId" TEXT,
    "mintTxHash" TEXT,
    "caption" TEXT,
    "location" TEXT,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "likesCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "rarity" INTEGER NOT NULL DEFAULT 1,
    "condition" JSONB NOT NULL,
    "isSbt" BOOLEAN NOT NULL DEFAULT false,
    "sbtContract" TEXT,
    "sbtMetadataUri" TEXT,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarnedAchievement" (
    "id" TEXT NOT NULL,
    "frogId" INTEGER NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sbtTokenId" TEXT,
    "sbtTxHash" TEXT,

    CONSTRAINT "EarnedAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDecoration_souvenirId_key" ON "UserDecoration"("souvenirId");

-- CreateIndex
CREATE INDEX "UserDecoration_frogId_idx" ON "UserDecoration"("frogId");

-- CreateIndex
CREATE INDEX "UserDecoration_decorationId_idx" ON "UserDecoration"("decorationId");

-- CreateIndex
CREATE INDEX "RoomLayout_frogId_idx" ON "RoomLayout"("frogId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomLayout_frogId_sceneType_key" ON "RoomLayout"("frogId", "sceneType");

-- CreateIndex
CREATE INDEX "PlacedItem_layoutId_idx" ON "PlacedItem"("layoutId");

-- CreateIndex
CREATE INDEX "PlacedItem_userDecorationId_idx" ON "PlacedItem"("userDecorationId");

-- CreateIndex
CREATE INDEX "RoomLayoutSnapshot_layoutId_idx" ON "RoomLayoutSnapshot"("layoutId");

-- CreateIndex
CREATE INDEX "Gift_toFrogId_idx" ON "Gift"("toFrogId");

-- CreateIndex
CREATE INDEX "Gift_fromAddress_idx" ON "Gift"("fromAddress");

-- CreateIndex
CREATE INDEX "Gift_isOpened_idx" ON "Gift"("isOpened");

-- CreateIndex
CREATE INDEX "Photo_frogId_idx" ON "Photo"("frogId");

-- CreateIndex
CREATE INDEX "Photo_travelId_idx" ON "Photo"("travelId");

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_code_key" ON "Achievement"("code");

-- CreateIndex
CREATE INDEX "EarnedAchievement_frogId_idx" ON "EarnedAchievement"("frogId");

-- CreateIndex
CREATE INDEX "EarnedAchievement_achievementId_idx" ON "EarnedAchievement"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "EarnedAchievement_frogId_achievementId_key" ON "EarnedAchievement"("frogId", "achievementId");

-- AddForeignKey
ALTER TABLE "UserDecoration" ADD CONSTRAINT "UserDecoration_decorationId_fkey" FOREIGN KEY ("decorationId") REFERENCES "Decoration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDecoration" ADD CONSTRAINT "UserDecoration_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomLayout" ADD CONSTRAINT "RoomLayout_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacedItem" ADD CONSTRAINT "PlacedItem_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "RoomLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacedItem" ADD CONSTRAINT "PlacedItem_userDecorationId_fkey" FOREIGN KEY ("userDecorationId") REFERENCES "UserDecoration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomLayoutSnapshot" ADD CONSTRAINT "RoomLayoutSnapshot_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "RoomLayout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_toFrogId_fkey" FOREIGN KEY ("toFrogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarnedAchievement" ADD CONSTRAINT "EarnedAchievement_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarnedAchievement" ADD CONSTRAINT "EarnedAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
