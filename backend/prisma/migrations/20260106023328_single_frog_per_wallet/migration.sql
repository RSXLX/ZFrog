/*
  Warnings:

  - A unique constraint covering the columns `[ownerAddress]` on the table `Frog` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Frog_ownerAddress_key" ON "Frog"("ownerAddress");
