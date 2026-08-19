-- Phone number, so ops can call a customer directly (e.g. one who hasn't chosen next
-- week's menu). Additive, no backfill — existing customers get it filled in on next edit.
ALTER TABLE "Customer" ADD COLUMN "phone" TEXT;
