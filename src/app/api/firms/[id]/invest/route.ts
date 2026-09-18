import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures, getFirmConfig } from "@/lib/config";
import { getAssetPrices, valueFirm } from "@/lib/firm-data";
import { prisma } from "@/lib/prisma";

const investSchema = z.object({
  amount: z.number().positive().finite(),
});

/** A client hands cash to a firm and receives fund units at the current NAV. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("firms");

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
    const { amount } = investSchema.parse(await request.json());
    const config = getFirmConfig();

    if (amount < config.minDeposit) {
      return NextResponse.json(
        { error: `Minimum investment is $${config.minDeposit.toFixed(2)}` },
        { status: 400 }
      );
    }
    if (user.balance < amount) {
      return NextResponse.json({ error: "Insufficient funds" }, { status: 400 });
    }

    const firm = await prisma.firm.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { holdings: true, memecoinHoldings: true, members: true },
    });
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }
    if (firm.isClosed || !firm.isOpen) {
      return NextResponse.json(
        { error: "This firm is not accepting new investments" },
        { status: 400 }
      );
    }
    if (firm.managerId === user.id) {
      return NextResponse.json(
        { error: "Managers invest through their own trading, not as a client" },
        { status: 400 }
      );
    }

    const existingMember = firm.members.find((m) => m.userId === user.id);
    if (!existingMember && firm.members.length >= config.maxMembers) {
      return NextResponse.json(
        { error: `This firm is full (${config.maxMembers} clients)` },
        { status: 400 }
      );
    }

    const prices = await getAssetPrices();
    // Units are priced off the NAV as it stands before this deposit lands, so
    // an incoming client neither dilutes nor is diluted by existing clients.
    const { navPerUnit } = valueFirm(firm, prices);
    const fee = amount * (firm.feePercent / 100);
    const net = amount - fee;
    const units = net / navPerUnit;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } },
      });

      if (fee > 0) {
        await tx.user.update({
          where: { id: firm.managerId },
          data: { balance: { increment: fee } },
        });
      }

      await tx.firm.update({
        where: { id: firm.id },
        data: {
          balance: { increment: net },
          totalUnits: { increment: units },
        },
      });

      await tx.firmMembership.upsert({
        where: { firmId_userId: { firmId: firm.id, userId: user.id } },
        update: {
          units: { increment: units },
          invested: { increment: amount },
        },
        create: {
          firmId: firm.id,
          userId: user.id,
          units,
          invested: amount,
        },
      });

      await tx.firmTransaction.create({
        data: {
          firmId: firm.id,
          type: "DEPOSIT",
          assetType: "CASH",
          units,
          price: navPerUnit,
          amount: net,
          actorId: user.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      units,
      fee,
      navPerUnit,
      message: `Invested $${net.toFixed(2)} in ${firm.name}`,
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
    console.error("Firm invest error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
