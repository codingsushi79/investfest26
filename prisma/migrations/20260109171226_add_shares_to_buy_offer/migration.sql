-- CreateTable
CREATE TABLE "SellOffer" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL,
    "pricePerShare" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SellOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyOffer" (
    "id" TEXT NOT NULL,
    "sellOfferId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "offeredPrice" DOUBLE PRECISION NOT NULL,
    "shares" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyOffer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SellOffer_status_createdAt_idx" ON "SellOffer"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BuyOffer_sellOfferId_status_idx" ON "BuyOffer"("sellOfferId", "status");

-- AddForeignKey
ALTER TABLE "SellOffer" ADD CONSTRAINT "SellOffer_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellOffer" ADD CONSTRAINT "SellOffer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyOffer" ADD CONSTRAINT "BuyOffer_sellOfferId_fkey" FOREIGN KEY ("sellOfferId") REFERENCES "SellOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyOffer" ADD CONSTRAINT "BuyOffer_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
