import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures, getFeaturesConfig, getFirmConfig } from "@/lib/config";
import { getFirmsOverview, slugifyFirmName } from "@/lib/firm-data";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    assertFeatures("firms");

    const user = await getCurrentUser();
    const features = getFeaturesConfig();
    const config = getFirmConfig();
    const firms = await getFirmsOverview(user?.id);

    return NextResponse.json({
      firms,
      canCreate: !!user && features.firmCreation,
      canTrade: features.firmTrading,
      minDeposit: config.minDeposit,
      maxFeePercentage: config.maxFeePercentage,
      allowMemecoins: config.allowMemecoins && features.memecoins,
    });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.startsWith("Feature disabled") ? 404 : 500;
    if (status === 500) console.error("Firms error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

const createSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(280).optional(),
  feePercent: z.number().min(0).max(100).optional(),
});

/** Register a firm. The creator becomes its manager and trades for its clients. */
export async function POST(request: NextRequest) {
  try {
    assertFeatures("firms", "firmCreation");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: "Your account is banned" }, { status: 403 });
    }

    const config = getFirmConfig();
    const input = createSchema.parse(await request.json());
    const feePercent = input.feePercent ?? 0;

    if (feePercent > config.maxFeePercentage) {
      return NextResponse.json(
        { error: `Fee cannot exceed ${config.maxFeePercentage}%` },
        { status: 400 }
      );
    }

    const managedCount = await prisma.firm.count({
      where: { managerId: user.id, isClosed: false },
    });
    if (managedCount >= config.maxPerManager) {
      return NextResponse.json(
        {
          error:
            config.maxPerManager === 1
              ? "You already manage a firm"
              : `You can manage at most ${config.maxPerManager} firms`,
        },
        { status: 400 }
      );
    }

    const name = input.name.trim();
    const slug = slugifyFirmName(name);

    const clash = await prisma.firm.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (clash) {
      return NextResponse.json(
        { error: "A firm with that name already exists" },
        { status: 409 }
      );
    }

    const firm = await prisma.firm.create({
      data: {
        name,
        slug,
        description: input.description?.trim() || null,
        managerId: user.id,
        feePercent,
      },
    });

    return NextResponse.json({ id: firm.id, slug: firm.slug, name: firm.name });
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
