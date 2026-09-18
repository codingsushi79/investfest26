import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-utils";
import { assertFeatures, getFeaturesConfig } from "@/lib/config";
import { sendNewsEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

/** A firm's update history. Clients and the manager can read it. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    assertFeatures("firms", "firmNews");

    const { id } = await params;
    const firm = await prisma.firm.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      select: { id: true },
    });
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }

    const news = await prisma.firmNews.findMany({
      where: { firmId: firm.id },
      include: { author: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      news: news.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        author: item.author.username,
        recipients: item.recipients,
        emailedAt: item.emailedAt,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.startsWith("Feature disabled") ? 404 : 500;
    if (status === 500) console.error("Firm news error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(140),
  body: z.string().min(1).max(5000),
  /** Email it to the firm's investors as well as posting it. */
  sendEmail: z.boolean().optional(),
});

/** The manager writes an update for the firm's investors. */
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
    const firm = await prisma.firm.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        members: {
          include: { user: { select: { email: true, emailVerified: true } } },
        },
      },
    });
    if (!firm) {
      return NextResponse.json({ error: "Firm not found" }, { status: 404 });
    }
    if (firm.managerId !== user.id) {
      return NextResponse.json(
        { error: "Only the firm's manager can post updates" },
        { status: 403 }
      );
    }

    const input = createSchema.parse(await request.json());
    const wantsEmail = input.sendEmail !== false;

    // The firm's own mailing list: investors who kept email on, have a
    // verified address, and aren't the manager reading their own post.
    const recipients = wantsEmail
      ? firm.members
          .filter(
            (member) =>
              member.emailOptIn &&
              member.userId !== user.id &&
              member.user.email &&
              member.user.emailVerified
          )
          .map((member) => member.user.email as string)
      : [];

    let sent = 0;
    if (recipients.length > 0) {
      if (!getFeaturesConfig().firmNewsEmail) {
        return NextResponse.json(
          { error: "Firm emails are disabled" },
          { status: 400 }
        );
      }

      const result = await sendNewsEmail({
        recipients,
        heading: firm.name,
        title: input.title.trim(),
        body: input.body.trim(),
        footer: `You are invested in ${firm.name}. Turn these off from the firm's page.`,
        subjectPrefix: `${firm.name}:`,
      });
      sent = result.sent;
    }

    const post = await prisma.firmNews.create({
      data: {
        firmId: firm.id,
        authorId: user.id,
        title: input.title.trim(),
        body: input.body.trim(),
        recipients: sent,
        emailedAt: sent > 0 ? new Date() : null,
      },
    });

    return NextResponse.json({
      id: post.id,
      emailed: sent,
      message:
        sent > 0
          ? `Update posted and emailed to ${sent} investor${sent === 1 ? "" : "s"}`
          : "Update posted",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Firm news create error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
