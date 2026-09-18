import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures } from "@/lib/config";
import { getAssetPrices, valueFirm } from "@/lib/firm-data";
import { prisma } from "@/lib/prisma";

const withdrawSchema = z.object({
  units: z.number().positive().finite().optional(),
  all: z.boolean().optional(),
});

/** A client redeems fund units for cash at the current NAV. */
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

    const { id } = await params;
    const input = withdrawSchema.parse(await request.json());
    if (!input.all && !input.units) {
      return NextResponse.json({ error: "Nothing to withdraw" }, { status: 400 });
    }

    const firm = await prisma.firm.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: { holdings: true, cryptoHoldings: true, members: true },
    });
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    const membership = firm.members.find((m) => m.userId === user.id);
    if (!membership || membership.units <= 0) {
      return NextResponse.json(
        { error: "You have no units in this firm" },
        { status: 400 }
      );
    }

    const units = input.all ? membership.units : input.units!;
    if (units > membership.units + 1e-9) {
      return NextResponse.json({ error: "You do not own that many units" }, { status: 400 });
    }

    const prices = await getAssetPrices();
    const { navPerUnit } = valueFirm(firm, prices);
    const gross = units * navPerUnit;
    // The manager's cut of the withdrawal; managers don't charge themselves.
    const isManager = firm.managerId === user.id;
    const fee = isManager ? 0 : gross * (firm.withdrawFeePercent / 100);
    const payout = gross - fee;

    // Only the firm's uninvested cash can be paid out, and it has to cover the
    // whole redemption including the fee; otherwise the manager sells first.
    if (gross > firm.balance + 1e-9) {
      return NextResponse.json(
        {
          error: `The firm only has $${firm.balance.toFixed(
            2
          )} in cash. Ask the manager to sell positions before withdrawing $${gross.toFixed(2)}.`,
        },
        { status: 400 }
      );
    }

    const remainingUnits = membership.units - units;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: payout } },
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
          balance: { decrement: gross },
          totalUnits: { decrement: units },
        },
      });

      if (remainingUnits <= 1e-9) {
        await tx.firmMembership.delete({
          where: { firmId_userId: { firmId: firm.id, userId: user.id } },
        });
      } else {
        await tx.firmMembership.update({
          where: { firmId_userId: { firmId: firm.id, userId: user.id } },
          data: {
            units: remainingUnits,
            withdrawn: { increment: payout },
          },
        });
      }

      await tx.firmTransaction.create({
        data: {
          firmId: firm.id,
          type: "WITHDRAW",
          assetType: "CASH",
          units,
          price: navPerUnit,
          amount: gross,
          actorId: user.id,
        },
      });
    });

    return NextResponse.json({
      success: true,
      payout,
      fee,
      navPerUnit,
      message:
        fee > 0
          ? `Withdrew $${payout.toFixed(2)} from ${firm.name} after a $${fee.toFixed(
              2
            )} fee`
          : `Withdrew $${payout.toFixed(2)} from ${firm.name}`,
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
    console.error("Firm withdraw error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
