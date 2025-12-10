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
    const redirectUrl = isProduction
      ? "https://investfest26.vercel.app"
      : "http://localhost:3000";

    // Return HTML that redirects client-side to avoid 405 issues
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0; url=${redirectUrl}">
          <script>window.location.href = "${redirectUrl}";</script>
        </head>
        <body>
          <p>Signing out... <a href="${redirectUrl}">Click here if not redirected</a></p>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  } catch (error) {
    console.error("Signout error:", error);

    // Still redirect on error to avoid getting stuck
    const isProduction = process.env.NODE_ENV === "production";
    const redirectUrl = isProduction
      ? "https://investfest26.vercel.app"
      : "http://localhost:3000";

    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <meta http-equiv="refresh" content="0; url=${redirectUrl}">
          <script>window.location.href = "${redirectUrl}";</script>
        </head>
        <body>
          <p>Signing out... <a href="${redirectUrl}">Click here if not redirected</a></p>
        </body>
      </html>`,
      {
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}
