/*
  Warnings:

  - You are about to alter the column `value` on the `discount_codes` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `price` on the `races` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `price_early_bird` on the `races` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "discount_codes" ALTER COLUMN "value" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "races" ALTER COLUMN "price" SET DATA TYPE INTEGER,
ALTER COLUMN "price_early_bird" SET DATA TYPE INTEGER;
