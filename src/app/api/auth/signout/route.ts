import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth-utils";

export async function POST() {
  try {
    await signOut();

    // Determine the correct redirect URL
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || "http://localhost:3000";

    // Redirect to home page after sign out
    return NextResponse.redirect(new URL("/", baseUrl));
  } catch (error) {
    console.error("Signout error:", error);

    // Still redirect on error to avoid getting stuck
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || "http://localhost:3000";

    return NextResponse.redirect(new URL("/", baseUrl));
  }
}
