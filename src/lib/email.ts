import { Resend } from "resend";
import type { OtpPurpose } from "@/lib/otp";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

function getFromAddress() {
  return (
    process.env.EMAIL_FROM ?? "InvestFest <onboarding@resend.dev>"
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function sendOtpEmail({
  email,
  name,
  code,
  purpose,
}: {
  email: string;
  name: string;
  code: string;
  purpose: OtpPurpose;
}) {
  const isVerify = purpose === "verify";
  const subject = isVerify
    ? "Your InvestFest verification code"
    : "Your InvestFest password reset code";

  const intro = isVerify
    ? "Use this code to verify your email and finish setting up your account."
    : "Use this code to reset your password.";

  await getResend().emails.send({
    from: getFromAddress(),
    to: email,
    subject,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6; color: #111;">
        <h1 style="font-size: 20px;">${isVerify ? "Verify your email" : "Reset your password"}</h1>
        <p>Hi ${escapeHtml(name)},</p>
        <p>${intro}</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.3em; margin: 24px 0;">${code}</p>
        <p style="color: #555; font-size: 14px;">This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      </div>
    `,
  });
}
