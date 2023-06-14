/*
  Warnings:

  - You are about to drop the `race_checkout` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "race_checkout" DROP CONSTRAINT "race_checkout_race_id_fkey";

-- DropTable
DROP TABLE "race_checkout";

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "qtd" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_race_id_key" ON "carts"("user_id", "race_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
