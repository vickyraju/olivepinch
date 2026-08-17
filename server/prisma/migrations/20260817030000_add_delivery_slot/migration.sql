-- Physical drop-off batching preference, chosen at signup and on every renewal. Order/OrderItem
-- stay per-day exactly as before — this only controls how the dashboard groups days into a
-- delivery drop-off (Daily = unchanged, Weekly = one box a week, Alternate = a box every other day).
CREATE TYPE "DeliverySlot" AS ENUM ('DAILY', 'WEEKLY', 'ALTERNATE');

ALTER TABLE "Subscription" ADD COLUMN "deliverySlot" "DeliverySlot" NOT NULL DEFAULT 'DAILY';
