-- AlterEnum
ALTER TYPE "AchievementCategory" ADD VALUE 'CROSSCHAIN';

-- CreateTable
CREATE TABLE "CrossChainTransfer" (
    "id" TEXT NOT NULL,
    "fromFrogId" INTEGER NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "toFrogId" INTEGER,
    "amount" TEXT NOT NULL,
    "tokenSymbol" TEXT NOT NULL,
    "sourceChain" TEXT NOT NULL,
    "targetChain" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sourceTxHash" TEXT,
    "cctxHash" TEXT,
    "targetTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "CrossChainTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrossChainTransfer_fromFrogId_idx" ON "CrossChainTransfer"("fromFrogId");

-- CreateIndex
CREATE INDEX "CrossChainTransfer_toFrogId_idx" ON "CrossChainTransfer"("toFrogId");

-- CreateIndex
CREATE INDEX "CrossChainTransfer_fromAddress_idx" ON "CrossChainTransfer"("fromAddress");

-- CreateIndex
CREATE INDEX "CrossChainTransfer_toAddress_idx" ON "CrossChainTransfer"("toAddress");

-- CreateIndex
CREATE INDEX "CrossChainTransfer_status_idx" ON "CrossChainTransfer"("status");

-- AddForeignKey
ALTER TABLE "CrossChainTransfer" ADD CONSTRAINT "CrossChainTransfer_fromFrogId_fkey" FOREIGN KEY ("fromFrogId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrossChainTransfer" ADD CONSTRAINT "CrossChainTransfer_toFrogId_fkey" FOREIGN KEY ("toFrogId") REFERENCES "Frog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
