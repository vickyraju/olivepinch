-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT;
