/*
  Warnings:

  - You are about to drop the `Furniture` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Home` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Placement` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tokenId,chainType]` on the table `Souvenir` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Placement" DROP CONSTRAINT "Placement_furnitureId_fkey";

-- DropForeignKey
ALTER TABLE "Placement" DROP CONSTRAINT "Placement_homeId_fkey";

-- DropIndex
DROP INDEX "Souvenir_tokenId_key";

-- DropTable
DROP TABLE "Furniture";

-- DropTable
DROP TABLE "Home";

-- DropTable
DROP TABLE "Placement";

-- DropEnum
DROP TYPE "FurnitureType";

-- CreateIndex
CREATE UNIQUE INDEX "Souvenir_tokenId_chainType_key" ON "Souvenir"("tokenId", "chainType");
