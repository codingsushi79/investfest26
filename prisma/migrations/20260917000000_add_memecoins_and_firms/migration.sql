-- CreateTable
CREATE TABLE "Memecoin" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "seed" INTEGER NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0.02,
    "drift" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.01,
    "maxPrice" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "genesisAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memecoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemecoinHolding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memecoinId" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "MemecoinHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemecoinTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memecoinId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemecoinTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Firm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "managerId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalUnits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Firm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmMembership" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invested" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "withdrawn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmHolding" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "shares" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FirmHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmMemecoinHolding" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "memecoinId" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "FirmMemecoinHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FirmTransaction" (
    "id" TEXT NOT NULL,
    "firmId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "assetType" TEXT NOT NULL DEFAULT 'STOCK',
    "assetId" TEXT,
    "symbol" TEXT,
    "units" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Memecoin_symbol_key" ON "Memecoin"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "MemecoinHolding_userId_memecoinId_key" ON "MemecoinHolding"("userId", "memecoinId");

-- CreateIndex
CREATE INDEX "MemecoinTransaction_userId_createdAt_idx" ON "MemecoinTransaction"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Firm_name_key" ON "Firm"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Firm_slug_key" ON "Firm"("slug");

-- CreateIndex
CREATE INDEX "Firm_isClosed_createdAt_idx" ON "Firm"("isClosed", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FirmMembership_firmId_userId_key" ON "FirmMembership"("firmId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "FirmHolding_firmId_companyId_key" ON "FirmHolding"("firmId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FirmMemecoinHolding_firmId_memecoinId_key" ON "FirmMemecoinHolding"("firmId", "memecoinId");

-- CreateIndex
CREATE INDEX "FirmTransaction_firmId_createdAt_idx" ON "FirmTransaction"("firmId", "createdAt");

-- AddForeignKey
ALTER TABLE "MemecoinHolding" ADD CONSTRAINT "MemecoinHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemecoinHolding" ADD CONSTRAINT "MemecoinHolding_memecoinId_fkey" FOREIGN KEY ("memecoinId") REFERENCES "Memecoin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemecoinTransaction" ADD CONSTRAINT "MemecoinTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemecoinTransaction" ADD CONSTRAINT "MemecoinTransaction_memecoinId_fkey" FOREIGN KEY ("memecoinId") REFERENCES "Memecoin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Firm" ADD CONSTRAINT "Firm_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmMembership" ADD CONSTRAINT "FirmMembership_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmMembership" ADD CONSTRAINT "FirmMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmHolding" ADD CONSTRAINT "FirmHolding_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmHolding" ADD CONSTRAINT "FirmHolding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmMemecoinHolding" ADD CONSTRAINT "FirmMemecoinHolding_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmMemecoinHolding" ADD CONSTRAINT "FirmMemecoinHolding_memecoinId_fkey" FOREIGN KEY ("memecoinId") REFERENCES "Memecoin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirmTransaction" ADD CONSTRAINT "FirmTransaction_firmId_fkey" FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
