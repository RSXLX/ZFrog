-- CreateEnum
CREATE TYPE "GroupTravelStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "GroupTravel" (
    "id" SERIAL NOT NULL,
    "leaderId" INTEGER NOT NULL,
    "companionId" INTEGER NOT NULL,
    "travelId" INTEGER NOT NULL,
    "status" "GroupTravelStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupTravel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupTravel_travelId_key" ON "GroupTravel"("travelId");

-- CreateIndex
CREATE INDEX "GroupTravel_leaderId_idx" ON "GroupTravel"("leaderId");

-- CreateIndex
CREATE INDEX "GroupTravel_companionId_idx" ON "GroupTravel"("companionId");

-- CreateIndex
CREATE INDEX "GroupTravel_status_idx" ON "GroupTravel"("status");

-- AddForeignKey
ALTER TABLE "GroupTravel" ADD CONSTRAINT "GroupTravel_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTravel" ADD CONSTRAINT "GroupTravel_companionId_fkey" FOREIGN KEY ("companionId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupTravel" ADD CONSTRAINT "GroupTravel_travelId_fkey" FOREIGN KEY ("travelId") REFERENCES "Travel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
