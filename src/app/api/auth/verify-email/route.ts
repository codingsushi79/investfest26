import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyOtpSchema } from "@/lib/auth-validation";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { email, code } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found for that email." },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        success: "Email already verified. You can sign in.",
        alreadyVerified: true,
      });
    }

    const result = await verifyOtp(normalizedEmail, "verify", code);
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.reason === "invalid_code"
              ? "Incorrect code. Try again or request a new one."
              : "That code expired. Request a new one.",
        },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({
      success: "Email verified. You can sign in now.",
    });
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
