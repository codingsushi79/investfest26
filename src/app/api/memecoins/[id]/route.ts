import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures } from "@/lib/config";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(280).nullable().optional(),
});

/**
 * The operator can list, delist or rename a coin — but never touch its price,
 * which is owned by the coin's own walk.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("memecoins", "memecoinCreation");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.username !== process.env.OP_USERNAME) {
      return NextResponse.json({ error: "Operator only" }, { status: 403 });
    }

    const { id } = await params;
    const input = patchSchema.parse(await request.json());

    const coin = await prisma.memecoin.update({
      where: { id },
      data: {
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined
          ? { description: input.description?.trim() || null }
          : {}),
      },
    });

    return NextResponse.json({ id: coin.id, isActive: coin.isActive });
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
