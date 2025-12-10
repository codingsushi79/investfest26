import { NextResponse } from "next/server";
import { getAllPortfolios } from "@/lib/data";

export async function GET() {
  try {
    const portfolios = await getAllPortfolios();
    return NextResponse.json(portfolios);
  } catch (error) {
    console.error("Portfolios API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
