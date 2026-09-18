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
      allowMemecoins: config.allowMemecoins && features.memecoins && features.memecoinTrading,
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
  feePercent: z.number().min(0).max(100).optional(),
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

    if (input.feePercent !== undefined && input.feePercent > config.maxFeePercentage) {
      return NextResponse.json(
        { error: `Fee cannot exceed ${config.maxFeePercentage}%` },
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
        ...(input.feePercent !== undefined ? { feePercent: input.feePercent } : {}),
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
