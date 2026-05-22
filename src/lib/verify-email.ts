import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { createOtp } from "@/lib/otp";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function sendEmailVerificationOtp(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });

  if (!user?.email) {
    throw new Error("User not found");
  }

  if (user.emailVerified) {
    return { alreadyVerified: true as const };
  }

  const code = await createOtp(user.email, "verify");
  await sendOtpEmail({
    email: user.email,
    name: user.name ?? user.username,
    code,
    purpose: "verify",
  });

  return { alreadyVerified: false as const };
}

export async function sendPasswordResetOtp(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
  });

  if (!user?.email) {
    return { sent: false as const };
  }

  const code = await createOtp(user.email, "reset");
  await sendOtpEmail({
    email: user.email,
    name: user.name ?? user.username,
    code,
    purpose: "reset",
  });

  return { sent: true as const };
}
