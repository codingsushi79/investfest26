-- Memecoins are now called crypto. Rename in place so existing rows survive.
ALTER TABLE "Memecoin" RENAME TO "Crypto";
ALTER TABLE "MemecoinHolding" RENAME TO "CryptoHolding";
ALTER TABLE "MemecoinTransaction" RENAME TO "CryptoTransaction";
ALTER TABLE "FirmMemecoinHolding" RENAME TO "FirmCryptoHolding";

ALTER TABLE "CryptoHolding" RENAME COLUMN "memecoinId" TO "cryptoId";
ALTER TABLE "CryptoTransaction" RENAME COLUMN "memecoinId" TO "cryptoId";
ALTER TABLE "FirmCryptoHolding" RENAME COLUMN "memecoinId" TO "cryptoId";

ALTER TABLE "Crypto" RENAME CONSTRAINT "Memecoin_pkey" TO "Crypto_pkey";
ALTER TABLE "CryptoHolding" RENAME CONSTRAINT "MemecoinHolding_pkey" TO "CryptoHolding_pkey";
ALTER TABLE "CryptoTransaction" RENAME CONSTRAINT "MemecoinTransaction_pkey" TO "CryptoTransaction_pkey";
ALTER TABLE "FirmCryptoHolding" RENAME CONSTRAINT "FirmMemecoinHolding_pkey" TO "FirmCryptoHolding_pkey";

ALTER TABLE "CryptoHolding" RENAME CONSTRAINT "MemecoinHolding_userId_fkey" TO "CryptoHolding_userId_fkey";
ALTER TABLE "CryptoHolding" RENAME CONSTRAINT "MemecoinHolding_memecoinId_fkey" TO "CryptoHolding_cryptoId_fkey";
ALTER TABLE "CryptoTransaction" RENAME CONSTRAINT "MemecoinTransaction_userId_fkey" TO "CryptoTransaction_userId_fkey";
ALTER TABLE "CryptoTransaction" RENAME CONSTRAINT "MemecoinTransaction_memecoinId_fkey" TO "CryptoTransaction_cryptoId_fkey";
ALTER TABLE "FirmCryptoHolding" RENAME CONSTRAINT "FirmMemecoinHolding_firmId_fkey" TO "FirmCryptoHolding_firmId_fkey";
ALTER TABLE "FirmCryptoHolding" RENAME CONSTRAINT "FirmMemecoinHolding_memecoinId_fkey" TO "FirmCryptoHolding_cryptoId_fkey";

ALTER INDEX "Memecoin_symbol_key" RENAME TO "Crypto_symbol_key";
ALTER INDEX "MemecoinHolding_userId_memecoinId_key" RENAME TO "CryptoHolding_userId_cryptoId_key";
ALTER INDEX "MemecoinTransaction_userId_createdAt_idx" RENAME TO "CryptoTransaction_userId_createdAt_idx";
ALTER INDEX "FirmMemecoinHolding_firmId_memecoinId_key" RENAME TO "FirmCryptoHolding_firmId_cryptoId_key";

-- Existing firm ledger rows referred to the old asset name.
UPDATE "FirmTransaction" SET "assetType" = 'CRYPTO' WHERE "assetType" = 'MEMECOIN';

-- Firms charge separately on the way in and on the way out.
ALTER TABLE "Firm" RENAME COLUMN "feePercent" TO "depositFeePercent";
ALTER TABLE "Firm" ADD COLUMN "withdrawFeePercent" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Offers can now belong to a firm rather than to a person.
ALTER TABLE "SellOffer" ADD COLUMN "firmId" TEXT;
ALTER TABLE "BuyOffer" ADD COLUMN "firmId" TEXT;

CREATE INDEX "SellOffer_firmId_status_idx" ON "SellOffer"("firmId", "status");
CREATE INDEX "BuyOffer_firmId_status_idx" ON "BuyOffer"("firmId", "status");

ALTER TABLE "SellOffer" ADD CONSTRAINT "SellOffer_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BuyOffer" ADD CONSTRAINT "BuyOffer_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
