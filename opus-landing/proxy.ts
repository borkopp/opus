import { NextResponse, type NextRequest } from "next/server";
import { LANDING_PATHS, splitLocalePath } from "./lib/i18n/routing";

export function proxy(request: NextRequest) {
  const { locale, pathname } = splitLocalePath(request.nextUrl.pathname);
  if (!LANDING_PATHS.some((page) => page === pathname)) {
    return NextResponse.next();
  }

  // The existing Macedonian URLs remain canonical, including old shared links.
  if (/^\/mk(?:\/|$)/.test(request.nextUrl.pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname;
    return NextResponse.redirect(destination, 308);
  }

  const requestHeaders = new Headers(request.headers);
  // Always overwrite caller-supplied headers. URL, never a cookie or country,
  // determines crawlable content and its canonical metadata.
  requestHeaders.set("x-opus-locale", locale);
  const options = { request: { headers: requestHeaders } };
  if (pathname === request.nextUrl.pathname) return NextResponse.next(options);
  const destination = request.nextUrl.clone();
  destination.pathname = pathname;
  return NextResponse.rewrite(destination, options);
}

export const config = {
  matcher: [
    "/",
    "/pricing",
    "/contact",
    "/privacy",
    "/terms",
    "/en/:path*",
    "/sq/:path*",
    "/mk/:path*",
  ],
};
