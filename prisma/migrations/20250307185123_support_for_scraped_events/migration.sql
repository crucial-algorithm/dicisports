-- AlterEnum
ALTER TYPE "OrganizerStatus" ADD VALUE 'SCRAPED';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "is_scraped" BOOLEAN NOT NULL DEFAULT false;
