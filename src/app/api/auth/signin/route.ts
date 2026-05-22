import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth-utils";
import { getServerConfig } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();
    const requireEmailVerification =
      getServerConfig().auth.requireEmailVerification;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        password: true,
        balance: true,
        emailVerified: true,
        isBanned: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "This account has been banned" },
        { status: 403 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (
      requireEmailVerification &&
      user.email &&
      !user.emailVerified
    ) {
      return NextResponse.json(
        {
          error: "Verify your email before signing in.",
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    const session = await signIn(user);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        balance: user.balance,
      },
      session,
    });
  } catch (error) {
    console.error("Signin error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
