import type { NextRequest } from "next/server";
import { createAntiDDoSMiddleware } from "antiddos";

const antiDdos = createAntiDDoSMiddleware({
  maxRequestsPerWindow: 100,      // allow 100 requests per window
  windowMs: 60_000,               // 60 seconds
  blockDurationMs: 5 * 60_000,    // block for 5 minutes after abuse
  redirectUrl: "/ddos-blocked",  // redirect suspected DDoS traffic
});

export function middleware(req: NextRequest) {
  return antiDdos(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};