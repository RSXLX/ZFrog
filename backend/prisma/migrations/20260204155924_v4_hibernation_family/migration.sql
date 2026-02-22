-- CreateEnum
CREATE TYPE "HibernationStatus" AS ENUM ('ACTIVE', 'DROWSY', 'SLEEPING');

-- AlterTable
ALTER TABLE "Frog" ADD COLUMN     "blessingsReceived" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "familyId" INTEGER,
ADD COLUMN     "hibernatedAt" TIMESTAMP(3),
ADD COLUMN     "hibernationStatus" "HibernationStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "Family" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" INTEGER NOT NULL,
    "totemLevel" INTEGER NOT NULL DEFAULT 1,
    "totemProgress" INTEGER NOT NULL DEFAULT 0,
    "weeklyMileage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Family_name_key" ON "Family"("name");

-- AddForeignKey
ALTER TABLE "Frog" ADD CONSTRAINT "Frog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "Frog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
