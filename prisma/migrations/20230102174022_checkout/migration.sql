-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('auto', 'saved');

-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('checkout', 'pending', 'confirmed');

-- CreateTable
CREATE TABLE "race_checkout" (
    "id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "qtd" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_checkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "gender" CHAR(1),
    "birthday" TIMESTAMP(3),
    "phone_number" INTEGER,
    "identity_card" TEXT,
    "federation_number" INTEGER,
    "shirt_size" INTEGER,
    "nationality" TEXT,
    "postal_code" TEXT,
    "status" "ParticipantStatus" NOT NULL DEFAULT E'auto',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_participants" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "race_id" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT E'checkout',
    "display_order" SERIAL NOT NULL,
    "booking_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT E'checkout',
    "pin" INTEGER NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shirt_size" (
    "id" SERIAL NOT NULL,
    "name" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shirt_size_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "race_checkout_user_id_race_id_key" ON "race_checkout"("user_id", "race_id");

-- CreateIndex
CREATE UNIQUE INDEX "race_participants_participant_id_race_id_key" ON "race_participants"("participant_id", "race_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_event_id_user_id_key" ON "bookings"("event_id", "user_id");

-- AddForeignKey
ALTER TABLE "race_checkout" ADD CONSTRAINT "race_checkout_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_shirt_size_fkey" FOREIGN KEY ("shirt_size") REFERENCES "shirt_size"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
