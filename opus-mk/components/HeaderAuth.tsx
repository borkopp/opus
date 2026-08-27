"use client";

import { useConvexAuth } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconCalendarEvent, IconLogout } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { useOpusUser } from "@/components/OpusUserContext";

/**
 * Renders auth UI for the marketplace header.
 * - Signed out: shows a "Sign in" pill
 * - Signed in: shows bookings access and a sign-out control
 */
export function HeaderAuth() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { opusUser } = useOpusUser();
  const pathname = usePathname();
  const router = useRouter();

  if (isLoading) {
    return <div className="w-7 h-7 rounded-full bg-secondary animate-pulse" />;
  }

  if (!isAuthenticated) {
    const callbackUrl = pathname.startsWith("/") ? pathname : "/";
    return (
      <Link
        href={`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`}
        className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-secondary/80"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link
        href="/my-bookings"
        className="flex h-8 items-center gap-1.5 rounded-full bg-secondary px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-secondary/80"
        aria-label="My bookings"
      >
        <IconCalendarEvent size={15} aria-hidden="true" />
        <span className="hidden sm:inline">
          {opusUser?.name?.split(" ")[0] || "Bookings"}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => {
          void authClient.signOut().then(() => {
            router.replace("/");
            router.refresh();
          });
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label="Sign out"
        title="Sign out"
      >
        <IconLogout size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
