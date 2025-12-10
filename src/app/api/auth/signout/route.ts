import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth-utils";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    await signOut();

    // Redirect to production URL in production, localhost in development
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction
      ? "https://investfest26.vercel.app"
      : "http://localhost:3000";

    // Redirect to home page after sign out
    return NextResponse.redirect(new URL("/", baseUrl));
  } catch (error) {
    console.error("Signout error:", error);

    // Still redirect on error to avoid getting stuck
    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction
      ? "https://investfest26.vercel.app"
      : "http://localhost:3000";

    return NextResponse.redirect(new URL("/", baseUrl));
  }
}
