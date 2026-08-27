import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default function proxy(request: NextRequest) {
  // This is an optimistic navigation guard only. Every protected Convex
  // function still derives identity and tenant membership server-side.
  if (!getSessionCookie(request)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "callbackUrl",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/beauty/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
    "/ai-inbox/:path*",
    "/gap-optimizer/:path*",
    "/hospitality/:path*",
  ],
};
