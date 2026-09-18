import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  assertFeatures,
  getFirmConfig,
  getMemecoinConfig,
  getTradingConfig,
} from "@/lib/config";
import { getMemecoinPrice } from "@/lib/memecoin";
import { getTradingSharePrice } from "@/lib/pricing";
import { prisma } from "@/lib/prisma";

const tradeSchema = z.object({
  assetType: z.enum(["STOCK", "MEMECOIN"]).default("STOCK"),
  symbol: z.string().min(1),
  units: z.number().positive().finite(),
  type: z.enum(["BUY", "SELL"]),
});

/** The manager trades pooled client capital. Gains and losses land on the NAV. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("firms", "firmTrading");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.isBanned || user.isPaused) {
      return NextResponse.json(
        { error: "Your account cannot trade right now" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const input = tradeSchema.parse(await request.json());

    const firm = await prisma.firm.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }
    if (firm.managerId !== user.id) {
      return NextResponse.json(
        { error: "Only the firm's manager can trade its capital" },
        { status: 403 }
      );
    }
    if (firm.isClosed) {
      return NextResponse.json({ error: "This firm is closed" }, { status: 400 });
    }

    const symbol = input.symbol.trim().toUpperCase().replace(/^\$/, "");

    if (input.assetType === "MEMECOIN") {
      const firmConfig = getFirmConfig();
      if (!firmConfig.allowMemecoins) {
        return NextResponse.json(
          { error: "Firms cannot trade memecoins" },
          { status: 403 }
        );
      }
      assertFeatures("memecoins", "memecoinTrading");

      const coin = await prisma.memecoin.findUnique({ where: { symbol } });
      if (!coin) {
        return NextResponse.json({ error: "Coin not found" }, { status: 404 });
      }
      if (!coin.isActive && input.type === "BUY") {
        return NextResponse.json({ error: `$${coin.symbol} is delisted` }, { status: 400 });
      }

      const memeConfig = getMemecoinConfig();
      const price = getMemecoinPrice(coin, memeConfig.tickSeconds);
      const units = Math.round(input.units * 1e6) / 1e6;

      if (input.type === "BUY") {
        const cost = price * units;
        if (firm.balance < cost) {
          return NextResponse.json(
            { error: "The firm does not have enough cash" },
            { status: 400 }
          );
        }

        await prisma.$transaction(async (tx) => {
          await tx.firm.update({
            where: { id: firm.id },
            data: { balance: { decrement: cost } },
          });
          await tx.firmMemecoinHolding.upsert({
            where: { firmId_memecoinId: { firmId: firm.id, memecoinId: coin.id } },
            update: { units: { increment: units } },
            create: { firmId: firm.id, memecoinId: coin.id, units },
          });
          await tx.firmTransaction.create({
            data: {
              firmId: firm.id,
              type: "BUY",
              assetType: "MEMECOIN",
              assetId: coin.id,
              symbol: coin.symbol,
              units,
              price,
              amount: cost,
              actorId: user.id,
            },
          });
        });

        return NextResponse.json({
          success: true,
          message: `Bought ${units} $${coin.symbol} for $${cost.toFixed(2)}`,
        });
      }

      const holding = await prisma.firmMemecoinHolding.findUnique({
        where: { firmId_memecoinId: { firmId: firm.id, memecoinId: coin.id } },
      });
      if (!holding || holding.units + 1e-9 < units) {
        return NextResponse.json({ error: "The firm does not hold that many" }, { status: 400 });
      }

      const proceeds = price * units * (1 - memeConfig.sellFeePercentage / 100);
      const remaining = Math.round((holding.units - units) * 1e6) / 1e6;

      await prisma.$transaction(async (tx) => {
        await tx.firm.update({
          where: { id: firm.id },
          data: { balance: { increment: proceeds } },
        });
        if (remaining <= 0) {
          await tx.firmMemecoinHolding.delete({
            where: { firmId_memecoinId: { firmId: firm.id, memecoinId: coin.id } },
          });
        } else {
          await tx.firmMemecoinHolding.update({
            where: { firmId_memecoinId: { firmId: firm.id, memecoinId: coin.id } },
            data: { units: remaining },
          });
        }
        await tx.firmTransaction.create({
          data: {
            firmId: firm.id,
            type: "SELL",
            assetType: "MEMECOIN",
            assetId: coin.id,
            symbol: coin.symbol,
            units,
            price,
            amount: proceeds,
            actorId: user.id,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Sold ${units} $${coin.symbol} for $${proceeds.toFixed(2)}`,
      });
    }

    // Stocks trade in whole shares, at the same prices students get.
    assertFeatures("trading");
    const shares = Math.floor(input.units);
    if (shares <= 0) {
      return NextResponse.json({ error: "Shares must be a whole number" }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { symbol },
      include: { prices: { orderBy: { createdAt: "asc" } } },
    });
    if (!company || company.prices.length === 0) {
      return NextResponse.json({ error: "Company or price not found" }, { status: 404 });
    }

    const price = getTradingSharePrice(company.prices);

    if (input.type === "BUY") {
      const cost = price * shares;
      if (firm.balance < cost) {
        return NextResponse.json(
          { error: "The firm does not have enough cash" },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.firm.update({
          where: { id: firm.id },
          data: { balance: { decrement: cost } },
        });
        await tx.firmHolding.upsert({
          where: { firmId_companyId: { firmId: firm.id, companyId: company.id } },
          update: { shares: { increment: shares } },
          create: { firmId: firm.id, companyId: company.id, shares },
        });
        await tx.firmTransaction.create({
          data: {
            firmId: firm.id,
            type: "BUY",
            assetType: "STOCK",
            assetId: company.id,
            symbol: company.symbol,
            units: shares,
            price,
            amount: cost,
            actorId: user.id,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Bought ${shares} ${company.symbol} for $${cost.toFixed(2)}`,
      });
    }

    const holding = await prisma.firmHolding.findUnique({
      where: { firmId_companyId: { firmId: firm.id, companyId: company.id } },
    });
    if (!holding || holding.shares < shares) {
      return NextResponse.json({ error: "The firm does not hold that many shares" }, { status: 400 });
    }

    const sellPercentage = getTradingConfig().sellToMarketPercentage / 100;
    const proceeds = price * shares * sellPercentage;

    await prisma.$transaction(async (tx) => {
      await tx.firm.update({
        where: { id: firm.id },
        data: { balance: { increment: proceeds } },
      });
      if (holding.shares === shares) {
        await tx.firmHolding.delete({
          where: { firmId_companyId: { firmId: firm.id, companyId: company.id } },
        });
      } else {
        await tx.firmHolding.update({
          where: { firmId_companyId: { firmId: firm.id, companyId: company.id } },
          data: { shares: { decrement: shares } },
        });
      }
      await tx.firmTransaction.create({
        data: {
          firmId: firm.id,
          type: "SELL",
          assetType: "STOCK",
          assetId: company.id,
          symbol: company.symbol,
          units: shares,
          price,
          amount: proceeds,
          actorId: user.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Sold ${shares} ${company.symbol} for $${proceeds.toFixed(2)}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    const message = (error as Error).message;
    if (message.startsWith("Feature disabled")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Firm trade error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
