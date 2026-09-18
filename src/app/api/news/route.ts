import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures, getFeaturesConfig } from "@/lib/config";
import { sendNewsEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

function isOperator(username: string | undefined) {
  return !!username && username === process.env.OP_USERNAME;
}

/** Everyone reads the news; only the operator sees unpublished drafts. */
export async function GET() {
  try {
    assertFeatures("news");

    const user = await getCurrentUser();
    const operator = isOperator(user?.username);

    const posts = await prisma.newsPost.findMany({
      where: operator ? {} : { isPublished: true },
      include: { author: { select: { username: true } } },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        body: post.body,
        isPinned: post.isPinned,
        isPublished: post.isPublished,
        emailedAt: post.emailedAt,
        author: post.author.username,
        createdAt: post.createdAt,
      })),
      canManage: operator,
      canEmail: getFeaturesConfig().newsEmail,
    });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.startsWith("Feature disabled") ? 404 : 500;
    if (status === 500) console.error("News error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(140),
  body: z.string().min(1).max(5000),
  isPinned: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  /** Email the post to every verified user. Off unless explicitly asked for. */
  sendEmail: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    assertFeatures("news");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!isOperator(user.username)) {
      return NextResponse.json({ error: "Operator only" }, { status: 403 });
    }

    const input = createSchema.parse(await request.json());
    const wantsEmail = input.sendEmail === true;

    if (wantsEmail && !getFeaturesConfig().newsEmail) {
      return NextResponse.json(
        { error: "News emails are disabled" },
        { status: 400 }
      );
    }

    const post = await prisma.newsPost.create({
      data: {
        title: input.title.trim(),
        body: input.body.trim(),
        isPinned: input.isPinned ?? false,
        isPublished: input.isPublished ?? true,
        authorId: user.id,
      },
    });

    let emailed = 0;
    if (wantsEmail && post.isPublished) {
      // Only people who confirmed an address, and never the operator's own copy.
      const recipients = await prisma.user.findMany({
        where: {
          email: { not: null },
          emailVerified: { not: null },
          isBanned: false,
          username: { not: user.username },
        },
        select: { email: true },
      });

      const { sent } = await sendNewsEmail({
        recipients: recipients
          .map((row) => row.email)
          .filter((email): email is string => !!email),
        heading: process.env.NEXT_PUBLIC_APP_TITLE || "InvestFest",
        title: post.title,
        body: post.body,
        footer: "You are receiving this because you have an account.",
        subjectPrefix: "News:",
      });

      emailed = sent;
      await prisma.newsPost.update({
        where: { id: post.id },
        data: { emailedAt: new Date() },
      });
    }

    return NextResponse.json({ id: post.id, emailed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("News create error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
