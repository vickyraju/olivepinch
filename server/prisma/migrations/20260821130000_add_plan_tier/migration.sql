-- Each (planDuration, goal) pricing row splits into a Basic and Advanced tier. Existing
-- rows become Basic by default so current checkout prices are unaffected.
CREATE TYPE "PlanTier" AS ENUM ('BASIC', 'ADVANCED');

ALTER TABLE "Plan" ADD COLUMN "tier" "PlanTier" NOT NULL DEFAULT 'BASIC';

DROP INDEX "Plan_planDuration_goal_key";

CREATE UNIQUE INDEX "Plan_planDuration_goal_tier_key" ON "Plan"("planDuration", "goal", "tier");
