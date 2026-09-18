import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { featuresConfig } from "@/lib/config";

/** Pages that disappear when their feature flag is off. */
const GATED_ROUTES: Array<{ prefix: string; feature: keyof typeof featuresConfig }> = [
  { prefix: "/leaderboard", feature: "leaderboard" },
  { prefix: "/portfolios", feature: "portfolios" },
  { prefix: "/offers", feature: "offers" },
  { prefix: "/trade", feature: "trading" },
  { prefix: "/crypto", feature: "crypto" },
  { prefix: "/firms", feature: "firms" },
  { prefix: "/news", feature: "news" },
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const blocked = GATED_ROUTES.find(
    (route) => pathname.startsWith(route.prefix) && !featuresConfig[route.feature]
  );

  if (blocked) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
