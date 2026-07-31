-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "supabaseUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_supabaseUserId_key" ON "Customer"("supabaseUserId");
