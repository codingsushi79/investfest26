import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/data";

export async function GET() {
  try {
    const rows = await getLeaderboard();
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
