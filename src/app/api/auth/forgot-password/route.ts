import { NextRequest, NextResponse } from "next/server";
import { emailSchema } from "@/lib/auth-validation";
import { sendPasswordResetOtp } from "@/lib/verify-email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = emailSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();

    try {
      await sendPasswordResetOtp(email);
    } catch (error) {
      console.error("Failed to send password reset OTP:", error);
      return NextResponse.json(
        {
          error:
            "Could not send reset code. Check RESEND_API_KEY and EMAIL_FROM configuration.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success:
        "If an account exists for that email, a reset code was sent.",
      email,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
