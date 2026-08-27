-- CreateEnum
CREATE TYPE "DeliveryTimeSlot" AS ENUM ('SLOT_6_7', 'SLOT_7_8', 'SLOT_8_9');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "deliveryTimeSlot" "DeliveryTimeSlot" NOT NULL DEFAULT 'SLOT_6_7';
