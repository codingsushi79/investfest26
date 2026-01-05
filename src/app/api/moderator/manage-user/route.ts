import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId, action } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: "Missing userId or action" }, { status: 400 });
    }

    // Verify the requester is an operator
    // This would typically be done with authentication middleware

    let updateData: any = {};

    switch (action) {
      case 'pause':
        updateData.isPaused = true;
        break;
      case 'unpause':
        updateData.isPaused = false;
        break;
      case 'ban':
        updateData.isBanned = true;
        break;
      case 'unban':
        updateData.isBanned = false;
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        isPaused: updatedUser.isPaused,
        isBanned: updatedUser.isBanned,
      }
    });
  } catch (error) {
    console.error("Error managing user:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
