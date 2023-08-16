-- AlterEnum
ALTER TYPE "OrganizerStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "organizers"
    ADD COLUMN "commission" DOUBLE PRECISION CHECK ("commission" BETWEEN 0 AND 100);
