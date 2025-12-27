-- CreateEnum
CREATE TYPE "TravelStage" AS ENUM ('DEPARTING', 'CROSSING', 'ARRIVING', 'EXPLORING', 'RETURNING');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('INFO', 'DISCOVERY', 'JOKE', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "ChainType" AS ENUM ('BSC_TESTNET', 'ETH_SEPOLIA', 'ZETACHAIN_ATHENS', 'POLYGON_MUMBAI', 'ARBITRUM_GOERLI');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateEnum
CREATE TYPE "ChatIntent" AS ENUM ('price_query', 'asset_query', 'frog_status', 'travel_info', 'start_travel', 'chitchat', 'help', 'unknown');

-- CreateEnum
CREATE TYPE "Personality" AS ENUM ('PHILOSOPHER', 'COMEDIAN', 'POET', 'GOSSIP');

-- CreateEnum
CREATE TYPE "FurnitureType" AS ENUM ('DECORATION', 'FUNCTIONAL', 'BACKGROUND', 'FLOOR', 'PLANT');

-- AlterTable
ALTER TABLE "Frog" ADD COLUMN     "p0Travels" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "personality" "Personality" NOT NULL DEFAULT 'PHILOSOPHER';

-- AlterTable
ALTER TABLE "Souvenir" ADD COLUMN     "chainType" "ChainType" NOT NULL DEFAULT 'ZETACHAIN_ATHENS';

-- AlterTable
ALTER TABLE "Travel" ADD COLUMN     "addressDiscoveredAt" TIMESTAMP(3),
ADD COLUMN     "completeTxHash" TEXT,
ADD COLUMN     "currentStage" "TravelStage" NOT NULL DEFAULT 'DEPARTING',
ADD COLUMN     "discoveredAt" TIMESTAMP(3),
ADD COLUMN     "duration" INTEGER NOT NULL DEFAULT 3600,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "isRandom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalTarget" TEXT,
ADD COLUMN     "originalTargetAddress" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "startTxHash" TEXT,
ADD COLUMN     "targetChain" "ChainType" NOT NULL DEFAULT 'ZETACHAIN_ATHENS',
ALTER COLUMN "chainId" SET DEFAULT 7001;

-- AlterTable
ALTER TABLE "WalletObservation" ADD COLUMN     "chainType" "ChainType" NOT NULL DEFAULT 'ZETACHAIN_ATHENS',
ADD COLUMN     "nativeBalance" TEXT,
ADD COLUMN     "protocols" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tokenBalances" JSONB;

-- CreateTable
CREATE TABLE "TravelStatusMessage" (
    "id" SERIAL NOT NULL,
    "travelId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL DEFAULT 'INFO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TravelStatusMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" SERIAL NOT NULL,
    "frogId" INTEGER NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "intent" "ChatIntent",
    "intentParams" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceCache" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "priceUsd" DOUBLE PRECISION NOT NULL,
    "change24h" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSnapshot" (
    "id" SERIAL NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "assets" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Home" (
    "id" SERIAL NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT DEFAULT '温馨小窝',
    "backgroundId" TEXT,
    "floorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Home_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Furniture" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FurnitureType" NOT NULL DEFAULT 'DECORATION',
    "rarity" "Rarity" NOT NULL DEFAULT 'Common',
    "iconUrl" TEXT,
    "assetUrl" TEXT,
    "isStackable" BOOLEAN NOT NULL DEFAULT false,
    "price" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Furniture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" SERIAL NOT NULL,
    "homeId" INTEGER NOT NULL,
    "furnitureId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "z" INTEGER NOT NULL DEFAULT 0,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFlipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TravelStatusMessage_travelId_idx" ON "TravelStatusMessage"("travelId");

-- CreateIndex
CREATE INDEX "ChatSession_ownerAddress_idx" ON "ChatSession"("ownerAddress");

-- CreateIndex
CREATE INDEX "ChatSession_frogId_idx" ON "ChatSession"("frogId");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "PriceCache_symbol_idx" ON "PriceCache"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "PriceCache_symbol_source_key" ON "PriceCache"("symbol", "source");

-- CreateIndex
CREATE INDEX "AssetSnapshot_ownerAddress_idx" ON "AssetSnapshot"("ownerAddress");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSnapshot_ownerAddress_chainId_key" ON "AssetSnapshot"("ownerAddress", "chainId");

-- CreateIndex
CREATE UNIQUE INDEX "Home_ownerAddress_key" ON "Home"("ownerAddress");

-- CreateIndex
CREATE INDEX "Home_ownerAddress_idx" ON "Home"("ownerAddress");

-- CreateIndex
CREATE INDEX "Placement_homeId_idx" ON "Placement"("homeId");

-- CreateIndex
CREATE INDEX "Souvenir_chainType_idx" ON "Souvenir"("chainType");

-- CreateIndex
CREATE INDEX "Travel_targetChain_idx" ON "Travel"("targetChain");

-- CreateIndex
CREATE INDEX "Travel_isRandom_idx" ON "Travel"("isRandom");

-- CreateIndex
CREATE INDEX "Travel_addressDiscoveredAt_idx" ON "Travel"("addressDiscoveredAt");

-- CreateIndex
CREATE INDEX "WalletObservation_chainType_idx" ON "WalletObservation"("chainType");

-- AddForeignKey
ALTER TABLE "TravelStatusMessage" ADD CONSTRAINT "TravelStatusMessage_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_frogId_fkey" FOREIGN KEY ("frogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "Home"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_furnitureId_fkey" FOREIGN KEY ("furnitureId") REFERENCES "Furniture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
