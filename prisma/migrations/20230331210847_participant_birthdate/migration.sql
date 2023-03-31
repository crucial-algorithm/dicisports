/*
  Warnings:

  - You are about to drop the column `birthday` on the `participants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "participants" DROP COLUMN "birthday",
ADD COLUMN     "birthdate" TIMESTAMP(3);
