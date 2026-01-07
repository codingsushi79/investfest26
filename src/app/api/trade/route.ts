import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tradeSchema = z.object({
  symbol: z.string(),
  shares: z.number().int().positive(),
  type: z.enum(["BUY", "SELL"]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json({ error: "Your account has been banned from trading" }, { status: 403 });
    }

    // Check if user is paused
    if (user.isPaused) {
      return NextResponse.json({ error: "Your account is currently paused from trading" }, { status: 403 });
    }

    // Check if trading has ended (stored in a cookie or header, for now we'll check via request)
    // Note: In production, you might want to store this in the database
    // For now, we'll rely on client-side checks, but add server-side validation if needed

    const body = await request.json();
    const { symbol, shares, type } = tradeSchema.parse(body);

    // Get the company and current price
    const company = await prisma.company.findUnique({
      where: { symbol },
      include: {
        prices: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!company || !company.prices[0]) {
      return NextResponse.json({ error: "Company or price not found" }, { status: 404 });
    }

    const price = company.prices[0].value;
    // For selling, users receive 90% of the market price for fairness
    const totalCost = type === "BUY" ? price * shares : price * shares * 0.9;

    if (type === "BUY") {
      // Check if user has enough balance
      if (user.balance < totalCost) {
        return NextResponse.json(
          { error: "Insufficient funds" },
          { status: 400 }
        );
      }

      // Update user balance
      await prisma.user.update({
        where: { id: user.id },
        data: { balance: { decrement: totalCost } },
      });

      // Update or create holding
      await prisma.holding.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id,
          },
        },
        update: { shares: { increment: shares } },
        create: {
          userId: user.id,
          companyId: company.id,
          shares,
        },
      });

      // Record transaction
      await prisma.transaction.create({
        data: {
          userId: user.id,
          companyId: company.id,
          type: "BUY",
          shares,
          price,
        },
      });
    } else {
      // SELL
      // Check if user has enough shares
      const holding = await prisma.holding.findUnique({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: company.id,
          },
        },
      });

      if (!holding || holding.shares < shares) {
        return NextResponse.json(
          { error: "Insufficient shares" },
          { status: 400 }
        );
      }

      // Update user balance
      await prisma.user.update({
        where: { id: user.id },
        data: { balance: { increment: totalCost } },
      });

      // Update holding
      if (holding.shares === shares) {
        // Remove holding if selling all shares
        await prisma.holding.delete({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: company.id,
            },
          },
        });
      } else {
        // Decrement shares
        await prisma.holding.update({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: company.id,
            },
          },
          data: { shares: { decrement: shares } },
        });
      }

      // Record transaction
      await prisma.transaction.create({
        data: {
          userId: user.id,
          companyId: company.id,
          type: "SELL",
          shares,
          price,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `${type === "BUY" ? "Bought" : "Sold"} ${shares} shares of ${symbol}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Trade error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
