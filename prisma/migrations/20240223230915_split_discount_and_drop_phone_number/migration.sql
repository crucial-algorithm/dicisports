/*
  Warnings:

  - You are about to drop the column `phone_number` on the `participants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "discount_code" TEXT,
ADD COLUMN     "discount_fixed" BOOLEAN,
ADD COLUMN     "discount_value" INTEGER;

-- AlterTable
ALTER TABLE "participants" DROP COLUMN "phone_number";
