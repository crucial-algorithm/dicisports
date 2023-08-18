-- AlterEnum
ALTER TYPE "OrganizerStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "organizers"
    ADD COLUMN "commission" DOUBLE PRECISION CHECK ("commission" BETWEEN 0 AND 100);

-- Update all tables to avoid losing data in Staging - we haven't got any data in production for this yet
UPDATE "organizers"
SET "comission" = 0
WHERE "comission" IS NULL;

-- Then set it back to NOT NULL
ALTER TABLE "organizer"
    ALTER COLUMN "organizers" SET NOT NULL;
