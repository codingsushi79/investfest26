import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures, getFeaturesConfig, getFirmConfig } from "@/lib/config";
import { getFirmDetail } from "@/lib/firm-data";
import { prisma } from "@/lib/prisma";

/** Routes accept either the firm's id or its slug. */
async function resolveFirmSlug(idOrSlug: string) {
  const firm = await prisma.firm.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, managerId: true },
  });
  return firm;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("firms");

    const { id } = await params;
    const firm = await resolveFirmSlug(id);
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    const user = await getCurrentUser();
    const detail = await getFirmDetail(firm.slug, user?.id);
    const config = getFirmConfig();
    const features = getFeaturesConfig();

    return NextResponse.json({
      ...detail,
      minDeposit: config.minDeposit,
      canTrade: features.firmTrading,
      allowCrypto: config.allowCrypto && features.crypto && features.cryptoTrading,
    });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.startsWith("Feature disabled") ? 404 : 500;
    if (status === 500) console.error("Firm detail error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

const patchSchema = z.object({
  description: z.string().max(280).nullable().optional(),
  isOpen: z.boolean().optional(),
  depositFeePercent: z.number().min(0).max(100).optional(),
  withdrawFeePercent: z.number().min(0).max(100).optional(),
});

/** The manager can edit the firm's pitch, fee and whether it takes new clients. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("firms");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const firm = await resolveFirmSlug(id);
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }
    if (firm.managerId !== user.id) {
      return NextResponse.json({ error: "Manager only" }, { status: 403 });
    }

    const input = patchSchema.parse(await request.json());
    const config = getFirmConfig();

    const requestedFees = [input.depositFeePercent, input.withdrawFeePercent];
    if (requestedFees.some((fee) => fee !== undefined && fee > config.maxFeePercentage)) {
      return NextResponse.json(
        { error: `Fees cannot exceed ${config.maxFeePercentage}%` },
        { status: 400 }
      );
    }

    await prisma.firm.update({
      where: { id: firm.id },
      data: {
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
        ...(input.isOpen !== undefined ? { isOpen: input.isOpen } : {}),
        ...(input.depositFeePercent !== undefined
          ? { depositFeePercent: input.depositFeePercent }
          : {}),
        ...(input.withdrawFeePercent !== undefined
          ? { withdrawFeePercent: input.withdrawFeePercent }
          : {}),
      },
    });

    return NextResponse.json({ success: true });
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

/**
 * Close a firm for good. Allowed only once the manager is the last one in it:
 * other people's money must be out first, and positions must be sold, since
 * deleting would otherwise strand shares the firm still holds. Whatever cash
 * is left goes back to the manager.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("firms");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const firm = await prisma.firm.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        members: true,
        holdings: true,
        cryptoHoldings: true,
        sellOffers: { where: { status: "active" } },
        buyOffers: { where: { status: "pending" } },
      },
    });

    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }
    if (firm.managerId !== user.id) {
      return NextResponse.json({ error: "Manager only" }, { status: 403 });
    }

    const others = firm.members.filter((member) => member.userId !== user.id);
    if (others.length > 0) {
      return NextResponse.json(
        {
          error: `${others.length} ${
            others.length === 1 ? "client still has" : "clients still have"
          } money invested. They have to withdraw before you can delete the firm.`,
        },
        { status: 400 }
      );
    }

    const openPositions =
      firm.holdings.filter((h) => h.shares > 0).length +
      firm.cryptoHoldings.filter((h) => h.units > 0).length;
    if (openPositions > 0) {
      return NextResponse.json(
        { error: "Sell the firm's positions before deleting it" },
        { status: 400 }
      );
    }

    if (firm.sellOffers.length > 0 || firm.buyOffers.length > 0) {
      return NextResponse.json(
        { error: "Cancel the firm's open offers before deleting it" },
        { status: 400 }
      );
    }

    const refund = firm.balance;

    await prisma.$transaction(async (tx) => {
      if (refund > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: refund } },
        });
      }
      // Memberships, news and ledger rows cascade from the firm.
      await tx.firm.delete({ where: { id: firm.id } });
    });

    return NextResponse.json({
      success: true,
      refund,
      message:
        refund > 0
          ? `${firm.name} deleted and $${refund.toFixed(2)} returned to you`
          : `${firm.name} deleted`,
    });
  } catch (error) {
    const message = (error as Error).message;
    console.error("Firm delete error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
