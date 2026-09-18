import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures, getMemecoinConfig } from "@/lib/config";
import { getMemecoinPrice } from "@/lib/memecoin";
import { prisma } from "@/lib/prisma";

const tradeSchema = z.object({
  symbol: z.string().min(1),
  units: z.number().positive().finite(),
  type: z.enum(["BUY", "SELL"]),
});

/** Coin amounts are fractional; keep them to 6dp so totals stay exact enough. */
function roundUnits(units: number) {
  return Math.round(units * 1e6) / 1e6;
}

export async function POST(request: NextRequest) {
  try {
    assertFeatures("memecoins", "memecoinTrading");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.isBanned) {
      return NextResponse.json(
        { error: "Your account has been banned from trading" },
        { status: 403 }
      );
    }
    if (user.isPaused) {
      return NextResponse.json(
        { error: "Your account is currently paused from trading" },
        { status: 403 }
      );
    }

    const { symbol, units: rawUnits, type } = tradeSchema.parse(await request.json());
    const units = roundUnits(rawUnits);
    if (units <= 0) {
      return NextResponse.json({ error: "Enter an amount above 0" }, { status: 400 });
    }

    const coin = await prisma.memecoin.findUnique({
      where: { symbol: symbol.trim().toUpperCase().replace(/^\$/, "") },
    });
    if (!coin) {
      return NextResponse.json({ error: "Coin not found" }, { status: 404 });
    }
    if (!coin.isActive) {
      return NextResponse.json({ error: `$${coin.symbol} is delisted` }, { status: 400 });
    }

    const config = getMemecoinConfig();
    // The price comes from the coin's own walk — no operator, no order book.
    const price = getMemecoinPrice(coin, config.tickSeconds);

    if (type === "BUY") {
      const cost = price * units;
      if (user.balance < cost) {
        return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { decrement: cost } },
        });
        await tx.memecoinHolding.upsert({
          where: { userId_memecoinId: { userId: user.id, memecoinId: coin.id } },
          update: { units: { increment: units } },
          create: { userId: user.id, memecoinId: coin.id, units },
        });
        await tx.memecoinTransaction.create({
          data: { userId: user.id, memecoinId: coin.id, type: "BUY", units, price },
        });
      });

      return NextResponse.json({
        success: true,
        price,
        total: cost,
        message: `Bought ${units} $${coin.symbol} for $${cost.toFixed(2)}`,
      });
    }

    const holding = await prisma.memecoinHolding.findUnique({
      where: { userId_memecoinId: { userId: user.id, memecoinId: coin.id } },
    });
    if (!holding || roundUnits(holding.units) < units) {
      return NextResponse.json({ error: "Insufficient coins" }, { status: 400 });
    }

    const gross = price * units;
    const proceeds = gross * (1 - config.sellFeePercentage / 100);
    const remaining = roundUnits(holding.units - units);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: proceeds } },
      });
      if (remaining <= 0) {
        await tx.memecoinHolding.delete({
          where: { userId_memecoinId: { userId: user.id, memecoinId: coin.id } },
        });
      } else {
        await tx.memecoinHolding.update({
          where: { userId_memecoinId: { userId: user.id, memecoinId: coin.id } },
          data: { units: remaining },
        });
      }
      await tx.memecoinTransaction.create({
        data: { userId: user.id, memecoinId: coin.id, type: "SELL", units, price },
      });
    });

    return NextResponse.json({
      success: true,
      price,
      total: proceeds,
      message: `Sold ${units} $${coin.symbol} for $${proceeds.toFixed(2)}`,
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
    console.error("Memecoin trade error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
