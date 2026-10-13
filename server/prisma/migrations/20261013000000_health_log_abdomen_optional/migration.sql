-- Abdomen is no longer collected. The column stays so existing entries keep their value, but new
-- entries leave it empty.
ALTER TABLE "HealthLog" ALTER COLUMN "abdomenCm" DROP NOT NULL;
