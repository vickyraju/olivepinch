-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "planDuration" INTEGER NOT NULL,
    "goal" "Goal" NOT NULL,
    "price" DECIMAL(8,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_planDuration_goal_key" ON "Plan"("planDuration", "goal");
