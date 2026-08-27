-- Meals per day becomes a fourth pricing dimension. Existing rows default to 2 meals,
-- matching the funnel/renewal's prior implicit default, so current prices carry forward
-- as the "2 meals" price; admin fills in 1- and 3-meal prices afterward.
ALTER TABLE "Plan" ADD COLUMN "mealsPerDay" INTEGER NOT NULL DEFAULT 2;

DROP INDEX "Plan_planDuration_goal_tier_key";

CREATE UNIQUE INDEX "Plan_planDuration_goal_tier_mealsPerDay_key" ON "Plan"("planDuration", "goal", "tier", "mealsPerDay");
