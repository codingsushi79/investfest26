import { NextResponse } from "next/server";
import { adminUpdatePrices } from "@/app/actions";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await adminUpdatePrices(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}

