import { Resend } from "resend";
import type { OtpPurpose } from "@/lib/otp";

const BRAND = {
  name: "InvestFest",
  siteUrl: "https://invest.sushii.dev",
  accent: "#2563eb",
  accentMuted: "#eff6ff",
} as const;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO_STACK =
  "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

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

function buildOtpEmailHtml({
  name,
  code,
  heading,
  intro,
}: {
  name: string;
  code: string;
  heading: string;
  intro: string;
}) {
  const safeName = escapeHtml(name);
  const safeCode = escapeHtml(code);
  const safeHeading = escapeHtml(heading);
  const safeIntro = escapeHtml(intro);
  const safeBrand = escapeHtml(BRAND.name);

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safeHeading}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;color:#18181b;font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="height:4px;background-color:${BRAND.accent};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px;font-family:${FONT_STACK};">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${BRAND.accent};">${safeBrand}</p>
              <h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.35;color:#09090b;letter-spacing:-0.02em;">${safeHeading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;font-family:${FONT_STACK};">
              <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#3f3f46;">Hi ${safeName},</p>
              <p style="margin:0;font-size:15px;line-height:1.65;color:#3f3f46;">${safeIntro}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="background-color:${BRAND.accentMuted};border:1px solid #dbeafe;border-radius:12px;padding:24px 20px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#71717a;font-family:${FONT_STACK};">Your code</p>
                    <p style="margin:0;font-family:${MONO_STACK};font-size:34px;font-weight:700;letter-spacing:0.28em;color:#09090b;line-height:1;">${safeCode}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;font-family:${FONT_STACK};">
              <p style="margin:0;font-size:14px;line-height:1.6;color:#71717a;">This code expires in <strong style="color:#52525b;font-weight:600;">15 minutes</strong>. If you didn&rsquo;t request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;border-top:1px solid #f4f4f5;background-color:#fafafa;font-family:${FONT_STACK};">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;text-align:center;">
                <a href="${BRAND.siteUrl}" style="color:#71717a;text-decoration:none;font-weight:500;">${safeBrand}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function buildOtpEmailText({
  name,
  code,
  heading,
  intro,
}: {
  name: string;
  code: string;
  heading: string;
  intro: string;
}) {
  return [
    heading,
    "",
    `Hi ${name},`,
    "",
    intro,
    "",
    `Your code: ${code}`,
    "",
    "This code expires in 15 minutes. If you didn't request this, you can ignore this email.",
    "",
    BRAND.name,
    BRAND.siteUrl,
  ].join("\n");
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

  const heading = isVerify ? "Verify your email" : "Reset your password";
  const intro = isVerify
    ? "Use this code to verify your email and finish setting up your account."
    : "Use this code to reset your password.";

  const html = buildOtpEmailHtml({ name, code, heading, intro });
  const text = buildOtpEmailText({ name, code, heading, intro });

  await getResend().emails.send({
    from: getFromAddress(),
    to: email,
    subject,
    html,
    text,
  });
}
