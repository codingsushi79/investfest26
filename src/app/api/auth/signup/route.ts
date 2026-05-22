import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth-utils";
import { getServerConfig } from "@/lib/config";
import { createOtp } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, email } = await request.json();
    const requireEmailVerification =
      getServerConfig().auth.requireEmailVerification;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (requireEmailVerification && !email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (username.length < 3 || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Username must be at least 3 characters and password at least 6 characters",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email?.trim().toLowerCase() || null;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 }
        );
      }
      if (normalizedEmail && existingUser.email === normalizedEmail) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name: name || null,
        email: normalizedEmail,
        balance: 1000,
        emailVerified: requireEmailVerification ? null : new Date(),
      },
    });

    if (requireEmailVerification && normalizedEmail) {
      try {
        const code = await createOtp(normalizedEmail, "verify");
        await sendOtpEmail({
          email: normalizedEmail,
          name: name || username,
          code,
          purpose: "verify",
        });
      } catch (error) {
        console.error("Failed to send verification OTP:", error);
        return NextResponse.json(
          {
            error:
              "Account created, but we couldn't send a verification code. Try resending from the verification page.",
            requiresVerification: true,
            email: normalizedEmail,
          },
          { status: 201 }
        );
      }

      return NextResponse.json(
        {
          requiresVerification: true,
          email: normalizedEmail,
          message: "Enter the 6-digit code we sent to your email.",
        },
        { status: 201 }
      );
    }

    await signIn(user);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        balance: user.balance,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
