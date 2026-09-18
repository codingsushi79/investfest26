import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures } from "@/lib/config";
import { prisma } from "@/lib/prisma";

async function requireOperator() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  if (user.username !== process.env.OP_USERNAME) throw new Error("Operator only");
  return user;
}

const patchSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  body: z.string().min(1).max(5000).optional(),
  isPinned: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("news");
    await requireOperator();

    const { id } = await params;
    const input = patchSchema.parse(await request.json());

    await prisma.newsPost.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.body !== undefined ? { body: input.body.trim() } : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
        ...(input.isPublished !== undefined
          ? { isPublished: input.isPublished }
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
    const message = (error as Error).message;
    const status = message === "Operator only" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("news");
    await requireOperator();

    const { id } = await params;
    await prisma.newsPost.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = (error as Error).message;
    const status = message === "Operator only" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
