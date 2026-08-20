-- Menu items no longer carry their own price/premium flag (pricing is entirely
-- plan-based now, see 20260820102549_add_plan) or a production-capacity limit.
ALTER TABLE "MenuItem" DROP COLUMN "price";
ALTER TABLE "MenuItem" DROP COLUMN "premium";
ALTER TABLE "MenuItem" DROP COLUMN "dailyCapacity";
