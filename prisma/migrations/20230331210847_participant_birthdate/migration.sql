/*
  Warnings:

  - You are about to drop the column `birthday` on the `participants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "participants" RENAME COLUMN "birthday" TO "birthdate";
