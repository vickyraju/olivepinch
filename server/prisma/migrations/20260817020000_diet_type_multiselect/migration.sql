-- Replace the single-value Customer.dietType with a multi-select Customer.dietTypes array,
-- backfilling any existing single selection so no data is lost.
ALTER TABLE "Customer" ADD COLUMN "dietTypes" "DietType"[] NOT NULL DEFAULT '{}';

UPDATE "Customer" SET "dietTypes" = ARRAY["dietType"] WHERE "dietType" IS NOT NULL;

ALTER TABLE "Customer" DROP COLUMN "dietType";
