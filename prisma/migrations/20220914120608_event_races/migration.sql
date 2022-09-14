-- AlterTable
ALTER TABLE "events" ADD COLUMN     "directions" TEXT,
ADD COLUMN     "event_description" TEXT,
ADD COLUMN     "image1" TEXT,
ADD COLUMN     "image2" TEXT,
ADD COLUMN     "image3" TEXT,
ADD COLUMN     "image4" TEXT,
ADD COLUMN     "image5" TEXT;

-- CreateTable
CREATE TABLE "perks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "display_order" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,

    CONSTRAINT "perks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "start_time" INTEGER NOT NULL,
    "elevation_gain" INTEGER NOT NULL,
    "elevation_loss" INTEGER,
    "price" DOUBLE PRECISION NOT NULL,
    "price_early_bird" DOUBLE PRECISION,
    "valid_until" TIMESTAMP(3),
    "race_description" TEXT,
    "display_order" SERIAL NOT NULL,
    "status" "Status" NOT NULL DEFAULT E'auto',
    "event_id" TEXT NOT NULL,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "perks" ADD CONSTRAINT "perks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "races" ADD CONSTRAINT "races_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
