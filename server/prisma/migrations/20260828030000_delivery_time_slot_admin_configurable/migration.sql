-- CreateTable
CREATE TABLE "DeliveryTimeSlot" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryTimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryTimeSlot_label_key" ON "DeliveryTimeSlot"("label");

-- Seed the three windows that were previously hardcoded as an enum, so existing
-- subscriptions keep matching a real, admin-editable row.
INSERT INTO "DeliveryTimeSlot" ("id", "label", "sortOrder", "active", "updatedAt") VALUES
  (gen_random_uuid()::text, '6:00 – 7:00', 0, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '7:00 – 8:00', 1, true, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '8:00 – 9:00', 2, true, CURRENT_TIMESTAMP);

-- AlterTable: Subscription.deliveryTimeSlot moves from a fixed enum to a plain label
-- string matching DeliveryTimeSlot.label, so admin-added slots need no further migration.
ALTER TABLE "Subscription" ALTER COLUMN "deliveryTimeSlot" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "deliveryTimeSlot" TYPE TEXT USING (
  CASE "deliveryTimeSlot"::text
    WHEN 'SLOT_6_7' THEN '6:00 – 7:00'
    WHEN 'SLOT_7_8' THEN '7:00 – 8:00'
    WHEN 'SLOT_8_9' THEN '8:00 – 9:00'
  END
);
ALTER TABLE "Subscription" ALTER COLUMN "deliveryTimeSlot" SET DEFAULT '6:00 – 7:00';

-- DropEnum
DROP TYPE "DeliveryTimeSlot";
