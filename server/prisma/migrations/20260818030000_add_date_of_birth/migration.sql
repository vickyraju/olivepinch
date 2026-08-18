-- Replace the stored-integer age with an exact date of birth, so age never goes stale and
-- we have real DOB data for future birthday-campaign emails. No backfill: an integer age
-- can't be turned back into an exact date.
ALTER TABLE "Customer" ADD COLUMN "dateOfBirth" DATE;
ALTER TABLE "Customer" DROP COLUMN "age";
