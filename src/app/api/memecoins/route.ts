import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures, getFeaturesConfig, getMemecoinConfig } from "@/lib/config";
import { getMemecoinMarket } from "@/lib/memecoin-data";
import { createMemecoinSeed, normalizeMemecoinSymbol } from "@/lib/memecoin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    assertFeatures("memecoins");

    const user = await getCurrentUser();
    const market = await getMemecoinMarket(user?.id);

    return NextResponse.json({
      ...market,
      canCreate:
        !!user &&
        user.username === process.env.OP_USERNAME &&
        getFeaturesConfig().memecoinCreation,
      canTrade: getFeaturesConfig().memecoinTrading,
    });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.startsWith("Feature disabled") ? 404 : 500;
    if (status === 500) console.error("Memecoins error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

const createSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1).max(60),
  description: z.string().max(280).optional(),
  startPrice: z.number().positive().optional(),
  volatility: z.number().min(0).max(1).optional(),
  drift: z.number().min(-1).max(1).optional(),
});

export async function POST(request: NextRequest) {
  try {
    assertFeatures("memecoins", "memecoinCreation");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.username !== process.env.OP_USERNAME) {
      return NextResponse.json({ error: "Operator only" }, { status: 403 });
    }

    const config = getMemecoinConfig();
    const input = createSchema.parse(await request.json());
    const symbol = normalizeMemecoinSymbol(input.symbol);

    const coinCount = await prisma.memecoin.count();
    if (coinCount >= config.maxCoins) {
      return NextResponse.json(
        { error: `Coin limit reached (${config.maxCoins})` },
        { status: 400 }
      );
    }

    const existing = await prisma.memecoin.findUnique({ where: { symbol } });
    if (existing) {
      return NextResponse.json(
        { error: `$${symbol} already exists` },
        { status: 409 }
      );
    }

    const coin = await prisma.memecoin.create({
      data: {
        symbol,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        seed: createMemecoinSeed(),
        basePrice: input.startPrice ?? config.defaultStartPrice,
        volatility: input.volatility ?? config.defaultVolatility,
        drift: input.drift ?? config.defaultDrift,
        minPrice: config.minPrice,
        genesisAt: new Date(),
      },
    });

    return NextResponse.json({ id: coin.id, symbol: coin.symbol });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
