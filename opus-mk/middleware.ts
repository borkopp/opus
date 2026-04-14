import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// opus-mk is a public marketplace — ALL routes are public.
// Clerk middleware just makes auth context available without blocking.
const isPublicRoute = createRouteMatcher(["/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // No-op — every route is public. Auth context is available but never required.
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
