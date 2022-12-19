-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('checkout', 'paying', 'payed');

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
    "gender" INTEGER,
    "birthday" TIMESTAMP(3),
    "phone_number" INTEGER,
    "cc" INTEGER,
    "federation_number" INTEGER,
    "shirt_size" INTEGER,
    "nationality" TEXT,
    "postal_code" TEXT,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "race_checkout_user_id_race_id_key" ON "race_checkout"("user_id", "race_id");

-- CreateIndex
CREATE UNIQUE INDEX "race_participants_participant_id_race_id_key" ON "race_participants"("participant_id", "race_id");

-- AddForeignKey
ALTER TABLE "race_checkout" ADD CONSTRAINT "race_checkout_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_participants" ADD CONSTRAINT "race_participants_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
