-- AlterTable
ALTER TABLE "PricePoint" ADD COLUMN     "companyValue" DOUBLE PRECISION,
ADD COLUMN     "sharesOutstanding" INTEGER;

-- Backfill Y0 Q4 baseline points: $100/share × 100 shares = $10,000
UPDATE "PricePoint"
SET "companyValue" = "value" * 100,
    "sharesOutstanding" = 100
WHERE "label" = 'Y0 Q4';
