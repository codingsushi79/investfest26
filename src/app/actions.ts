'use server';

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-utils";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertFeatures } from "@/lib/config";
import { ensureSeedData, getTotalSharesByCompany } from "@/lib/data";
import {
  BASELINE_PERIOD,
  BASELINE_SHARES,
  getNextTimePeriod,
  getTradingSharePrice,
  isInBaselinePeriod,
} from "@/lib/pricing";

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
    include: { prices: { orderBy: { createdAt: "asc" } } },
  });
  if (!company || company.prices.length === 0) {
    throw new Error("Company or price not found");
  }

  const price = getTradingSharePrice(company.prices);
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
    include: { prices: { orderBy: { createdAt: "asc" } } },
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

  const price = getTradingSharePrice(company.prices);
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
    label: z.string().optional(),
    companyValue: z.number().positive(),
    advancePeriod: z.boolean().optional(),
  })
).min(1);

/**
 * Set the company value for one company or for many in a single pass. Each row
 * is applied independently, so one bad row rolls the whole batch back.
 */
export async function adminUpdatePrices(rows: z.infer<typeof adminPriceSchema>) {
  assertFeatures("adminPriceUpdates");
  if (rows.length > 1) {
    assertFeatures("bulkPriceUpdates");
  }

  const user = await getCurrentUser();
  const adminUsername = process.env.OP_USERNAME;

  console.log("Admin check details:");
  console.log("- User object:", user);
  console.log("- User username:", user?.username);
  console.log("- Admin username from env:", adminUsername);
  console.log("- Environment OP_USERNAME:", process.env.OP_USERNAME);
  console.log("- Comparison result:", user?.username === adminUsername);

  if (!user) {
    console.log("No user found - not authenticated");
    throw new Error("Not authenticated");
  }

  if (!user.username) {
    console.log("User has no username");
    throw new Error("User has no username");
  }

  if (!adminUsername) {
    console.log("No admin username set in environment");
    throw new Error("Admin username not configured");
  }

  if (user.username !== adminUsername) {
    console.log(`Username mismatch: user="${user.username}" vs admin="${adminUsername}"`);
    throw new Error("Admin only");
  }

  console.log("Admin check passed!");

  const updates = adminPriceSchema.parse(rows);

  const seen = new Set<string>();
  for (const update of updates) {
    if (seen.has(update.symbol)) {
      throw new Error(`Duplicate row for ${update.symbol}`);
    }
    seen.add(update.symbol);
  }

  const companies = await prisma.company.findMany({
    where: { symbol: { in: updates.map((u) => u.symbol) } },
    include: { prices: true },
  });
  const companiesBySymbol = new Map(companies.map((c) => [c.symbol, c]));
  const totalSharesByCompany = await getTotalSharesByCompany();

  await prisma.$transaction(async (tx) => {
    for (const item of updates) {
      const company = companiesBySymbol.get(item.symbol);
      if (!company) continue;

      const inBaseline = isInBaselinePeriod(company.prices);
      const advancePeriod = item.advancePeriod === true;

      if (inBaseline && !advancePeriod) {
        const sharesOutstanding = BASELINE_SHARES;
        const pricePerShare = item.companyValue / sharesOutstanding;
        const existing = company.prices.find(
          (point) => point.label === BASELINE_PERIOD
        );

        if (existing) {
          await tx.pricePoint.update({
            where: { id: existing.id },
            data: {
              value: pricePerShare,
              companyValue: item.companyValue,
              sharesOutstanding,
            },
          });
        } else {
          await tx.pricePoint.create({
            data: {
              companyId: company.id,
              label: BASELINE_PERIOD,
              value: pricePerShare,
              companyValue: item.companyValue,
              sharesOutstanding,
            },
          });
        }
        continue;
      }

      const sharesOutstanding = totalSharesByCompany.get(company.id) ?? 0;
      if (sharesOutstanding <= 0) {
        throw new Error(
          `Cannot set company value for ${item.symbol}: no shares invested yet`
        );
      }

      const label =
        item.label?.trim() || getNextTimePeriod(company.prices);
      const pricePerShare = item.companyValue / sharesOutstanding;

      await tx.pricePoint.create({
        data: {
          companyId: company.id,
          label,
          value: pricePerShare,
          companyValue: item.companyValue,
          sharesOutstanding,
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath("/portfolios");
  revalidatePath("/company-values");
}

