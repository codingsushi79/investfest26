import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type OtpPurpose = "verify" | "reset";

export const OTP_TTL_MS = 15 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function otpIdentifier(email: string, purpose: OtpPurpose) {
  return `otp:${purpose}:${normalizeEmail(email)}`;
}

export function generateOtpCode() {
  return String(crypto.randomInt(100_000, 1_000_000));
}

export async function createOtp(email: string, purpose: OtpPurpose) {
  const normalizedEmail = normalizeEmail(email);
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 12);
  const identifier = otpIdentifier(normalizedEmail, purpose);

  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  await prisma.verificationToken.create({
    data: {
      identifier,
      token: codeHash,
      expires: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return code;
}

export async function verifyOtp(
  email: string,
  purpose: OtpPurpose,
  code: string
) {
  const normalizedEmail = normalizeEmail(email);
  const identifier = otpIdentifier(normalizedEmail, purpose);

  const record = await prisma.verificationToken.findFirst({
    where: { identifier },
  });

  if (!record || record.expires < new Date()) {
    return { ok: false as const, reason: "invalid_or_expired" as const };
  }

  const valid = await bcrypt.compare(code.trim(), record.token);
  if (!valid) {
    return { ok: false as const, reason: "invalid_code" as const };
  }

  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  return { ok: true as const, email: normalizedEmail };
}
