import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { tenantSlugFromHost } from "./lib/tenant-sites";

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk";
const protectedPrefixes = [
  "/beauty",
  "/settings",
  "/notifications",
  "/onboarding",
  "/ai-inbox",
  "/gap-optimizer",
];

function requiresSession(pathname: string): boolean {
  return (
    pathname === "/" ||
    protectedPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

export default function proxy(request: NextRequest) {
  const tenantSlug = tenantSlugFromHost(
    request.headers.get("host"),
    rootDomain,
  );
  if (tenantSlug) {
    const tenantUrl = request.nextUrl.clone();
    tenantUrl.pathname =
      request.nextUrl.pathname === "/"
        ? `/sites/${tenantSlug}`
        : `/sites/${tenantSlug}${request.nextUrl.pathname}`;
    return NextResponse.rewrite(tenantUrl);
  }

  if (!requiresSession(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

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
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|opus-mark.svg|.*\\..*).*)",
  ],
};
