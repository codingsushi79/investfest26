import { NextRequest, NextResponse } from "next/server";
import { emailSchema } from "@/lib/auth-validation";
import { sendEmailVerificationOtp } from "@/lib/verify-email";

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
      const result = await sendEmailVerificationOtp(email);
      if (result.alreadyVerified) {
        return NextResponse.json({
          success: "This email is already verified. You can sign in.",
        });
      }
    } catch (error) {
      console.error("Failed to resend verification OTP:", error);
      if (error instanceof Error && error.message === "User not found") {
        return NextResponse.json(
          { error: "No account found for that email." },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error:
            "Could not send verification code. Check RESEND_API_KEY and EMAIL_FROM configuration.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: "Verification code sent. Check your inbox.",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
