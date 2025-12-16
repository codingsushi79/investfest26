import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user is operator
    const opUsername = process.env.OP_USERNAME || "operator";
    if (currentUser.username !== opUsername) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all users except operator
    const users = await prisma.user.findMany({
      where: {
        username: {
          not: opUsername,
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
      orderBy: {
        username: "asc",
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Moderator users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

