-- AlterTable
ALTER TABLE "events" ADD COLUMN     "is_scraped" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scraped_organizer" TEXT;
