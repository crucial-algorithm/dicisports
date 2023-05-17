-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('requested', 'pending', 'submitted', 'paid', 'failed', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'REFERENCE', 'MBWAY');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "method" "PaymentMethod",
    "status" "PaymentStatus" NOT NULL DEFAULT 'requested',
    "amount" INTEGER NOT NULL,
    "transaction_id" TEXT,
    "notification_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "booking_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_notifications" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_id_key" ON "payments"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_notification_id_key" ON "payments"("notification_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
