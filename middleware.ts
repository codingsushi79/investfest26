import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSecurityConfig, featuresConfig } from "@/lib/config";

interface AntiDDoSConfig {
  /**
   * Maximum number of requests allowed from a single client within the window.
   */
  maxRequestsPerWindow: number;
  /**
   * Sliding window size in milliseconds.
   */
  windowMs: number;
  /**
   * How long (in ms) to block a client after they exceed the limit. Defaults to windowMs.
   */
  blockDurationMs?: number;
  /**
   * Optional URL or path to redirect suspected DDoS traffic to.
   * If omitted, a 429 response is returned instead.
   */
  redirectUrl?: string;
  /**
   * Function that derives a client key from the request (e.g. IP or header).
   */
  keyGenerator?: (req: NextRequest) => string;
}

interface ClientState {
  hits: number;
  firstHitAt: number;
  blockedUntil?: number;
}

// In-memory store keyed by client identifier. This is per-instance and not shared across servers.
const clients = new Map<string, ClientState>();

function getClientKey(req: NextRequest, keyGenerator?: (req: NextRequest) => string): string {
  if (keyGenerator) return keyGenerator(req);

  // Prefer x-forwarded-for (behind proxies/CDN), fall back to a generic "unknown" bucket.
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can be a comma-separated list; take the first IP.
    return forwardedFor.split(",")[0]!.trim();
  }

  return "unknown";
}

function handleBlockedRequest(req: NextRequest, redirectUrl?: string) {
  if (redirectUrl) {
    const url = new URL(redirectUrl, req.url);
    return NextResponse.redirect(url);
  }

  return new NextResponse("Too many requests", { status: 429 });
}

function createAntiDDoSMiddleware(config: AntiDDoSConfig) {
  const {
    maxRequestsPerWindow,
    windowMs,
    blockDurationMs = windowMs,
    redirectUrl,
    keyGenerator,
  } = config;

  if (maxRequestsPerWindow <= 0) {
    throw new Error("maxRequestsPerWindow must be greater than 0");
  }
  if (windowMs <= 0) {
    throw new Error("windowMs must be greater than 0");
  }

  return function antiDDoSMiddleware(req: NextRequest, _event?: NextFetchEvent) {
    const key = getClientKey(req, keyGenerator);
    const now = Date.now();

    let state = clients.get(key);
    if (!state) {
      state = { hits: 0, firstHitAt: now };
      clients.set(key, state);
    }

    // If client is currently blocked, short-circuit.
    if (state.blockedUntil && now < state.blockedUntil) {
      return handleBlockedRequest(req, redirectUrl);
    }

    // Reset the window if it has expired.
    if (now - state.firstHitAt > windowMs) {
      state.hits = 0;
      state.firstHitAt = now;
      state.blockedUntil = undefined;
    }

    state.hits += 1;

    if (state.hits > maxRequestsPerWindow) {
      // Mark client as blocked for the configured duration.
      state.blockedUntil = now + blockDurationMs;
      return handleBlockedRequest(req, redirectUrl);
    }

    // Allow the request to continue through the Next.js routing pipeline.
    return NextResponse.next();
  };
}

export function middleware(req: NextRequest, event: NextFetchEvent) {
  // Check feature toggles for specific routes
  const pathname = req.nextUrl.pathname;

  // Feature toggle checks
  if (pathname.startsWith('/leaderboard') && !featuresConfig.leaderboard) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/portfolios') && !featuresConfig.portfolios) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/offers') && !featuresConfig.offers) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/trade') && !featuresConfig.trading) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/company-values') && !featuresConfig.companyValues) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/moderator') && !featuresConfig.moderatorTools) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Apply DDoS protection if enabled (only on server-side)
  if (typeof window === 'undefined') {
    try {
      const securityConfig = getSecurityConfig();
      if (securityConfig.enableRateLimiting) {
        const antiDdos = createAntiDDoSMiddleware({
          maxRequestsPerWindow: securityConfig.maxRequestsPerMinute,
          windowMs: 60_000,               // 60 seconds
          blockDurationMs: 5 * 60_000,    // block for 5 minutes after abuse
          redirectUrl: "/ddos-blocked",  // redirect suspected DDoS traffic
        });
        return antiDdos(req, event);
      }
    } catch (error) {
      // If server config fails to load, skip DDoS protection
      console.warn('Failed to load security config for middleware:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
