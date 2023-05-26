/*
  Warnings:

  - A unique constraint covering the columns `[identity_card]` on the table `participants` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "participants_identity_card_key" ON "participants"("identity_card");
