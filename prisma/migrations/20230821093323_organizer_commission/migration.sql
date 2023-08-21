-- AlterEnum
ALTER TYPE "OrganizerStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "organizers" ADD COLUMN     "commission" INTEGER;