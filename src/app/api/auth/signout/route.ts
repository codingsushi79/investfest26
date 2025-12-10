import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth-utils";

export async function POST() {
  try {
    await signOut();
    // Redirect to home page after sign out
    return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  } catch (error) {
    console.error("Signout error:", error);
    // Still redirect on error to avoid getting stuck
    return NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  }
}
