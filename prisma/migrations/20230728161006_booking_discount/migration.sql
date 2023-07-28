/*
  Warnings:

  - The primary key for the `discount_codes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `active` on the `discount_codes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code,organizer_id]` on the table `discount_codes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `id` to the `discount_codes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiscountCodeStatus" AS ENUM ('auto', 'deleted', 'disabled');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "applied_discount" TEXT;

-- AlterTable
ALTER TABLE "discount_codes" DROP CONSTRAINT "discount_codes_pkey",
DROP COLUMN "active",
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "status" "DiscountCodeStatus" NOT NULL DEFAULT 'auto',
ALTER COLUMN "code" SET DATA TYPE TEXT,
ADD CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "race_participants" ALTER COLUMN "event_id" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "discount_codes_code_organizer_id_key" ON "discount_codes"("code", "organizer_id");
