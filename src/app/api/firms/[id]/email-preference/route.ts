import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures } from "@/lib/config";
import { prisma } from "@/lib/prisma";

const schema = z.object({ emailOptIn: z.boolean() });

/** A client turns this firm's email updates on or off for themselves. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("firms", "firmNews");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const { emailOptIn } = schema.parse(await request.json());

    const firm = await prisma.firm.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true },
    });
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    const membership = await prisma.firmMembership.findUnique({
      where: { firmId_userId: { firmId: firm.id, userId: user.id } },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "You are not a client of this firm" },
        { status: 400 }
      );
    }

    await prisma.firmMembership.update({
      where: { firmId_userId: { firmId: firm.id, userId: user.id } },
      data: { emailOptIn },
    });

    return NextResponse.json({
      success: true,
      emailOptIn,
      message: emailOptIn ? "Email updates on" : "Email updates off",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
