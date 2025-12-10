'use server';

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-utils";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureSeedData } from "@/lib/data";

const tradeSchema = z.object({
  symbol: z.string().min(1),
  shares: z.number().int().positive(),
});

export async function updateUsername(username: string) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Not authenticated");
  }

  const cleaned = username.trim();
  if (!cleaned) {
    throw new Error("Username is required");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { username: cleaned },
  });

  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/portfolios");
}

export async function buyShares(raw: { symbol: string; shares: number }) {
  await ensureSeedData();
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = user.id;

  const input = tradeSchema.parse({
    symbol: raw.symbol,
    shares: Number(raw.shares),
  });

  const company = await prisma.company.findUnique({
    where: { symbol: input.symbol },
    include: { prices: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!company || company.prices.length === 0) {
    throw new Error("Company or price not found");
  }

  const price = company.prices[0].value;
  const totalCost = price * input.shares;

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  if (!userRecord) throw new Error("User missing");

  if (userRecord.balance < totalCost) {
    throw new Error("Not enough balance");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: totalCost } },
    });

    await tx.holding.upsert({
      where: { userId_companyId: { userId, companyId: company.id } },
      update: { shares: { increment: input.shares } },
      create: {
        userId,
        companyId: company.id,
        shares: input.shares,
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        companyId: company.id,
        type: "BUY",
        shares: input.shares,
        price,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/portfolios");
}

export async function sellShares(raw: { symbol: string; shares: number }) {
  await ensureSeedData();
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Not authenticated");
  }
  const userId = user.id;

  const input = tradeSchema.parse({
    symbol: raw.symbol,
    shares: Number(raw.shares),
  });

  const company = await prisma.company.findUnique({
    where: { symbol: input.symbol },
    include: { prices: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!company || company.prices.length === 0) {
    throw new Error("Company or price not found");
  }

  const holding = await prisma.holding.findUnique({
    where: { userId_companyId: { userId, companyId: company.id } },
  });

  if (!holding || holding.shares < input.shares) {
    throw new Error("Not enough shares to sell");
  }

  const price = company.prices[0].value;
  const totalValue = price * input.shares;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: totalValue } },
    });

    await tx.holding.update({
      where: { userId_companyId: { userId, companyId: company.id } },
      data: { shares: { decrement: input.shares } },
    });

    await tx.transaction.create({
      data: {
        userId,
        companyId: company.id,
        type: "SELL",
        shares: input.shares,
        price,
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/portfolios");
}

const adminPriceSchema = z.array(
  z.object({
    symbol: z.string(),
    label: z.string(),
    value: z.number(),
  })
);

export async function adminUpdatePrices(rows: z.infer<typeof adminPriceSchema>) {
  const user = await getCurrentUser();
  const adminUsername = process.env.OP_USERNAME;
  if (!user?.username || !adminUsername || user.username !== adminUsername) {
    throw new Error("Admin only");
  }

  const updates = adminPriceSchema.parse(rows);
  const companies = await prisma.company.findMany({
    where: { symbol: { in: updates.map((u) => u.symbol) } },
  });
  const companiesBySymbol = new Map(companies.map((c) => [c.symbol, c.id]));

  await prisma.$transaction(async (tx) => {
    for (const item of updates) {
      const companyId = companiesBySymbol.get(item.symbol);
      if (!companyId) continue;
      await tx.pricePoint.create({
        data: {
          companyId,
          label: item.label,
          value: item.value,
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/portfolios");
}

