"use client";

import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { IconCalendarEvent } from "@tabler/icons-react";

/**
 * Renders auth UI for the marketplace header.
 * - Signed out: shows a "Sign in" pill
 * - Signed in: shows "My Bookings" link + Clerk UserButton avatar
 */
export function HeaderAuth() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return <div className="w-7 h-7 rounded-full bg-secondary animate-pulse" />;
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="redirect">
        <button className="text-xs font-semibold text-primary bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-full transition-colors">
          Sign in
        </button>
      </SignInButton>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/my-bookings"
        className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-full hover:bg-secondary/60 transition-colors"
      >
        <IconCalendarEvent size={14} aria-hidden="true" />
        <span className="hidden sm:inline">My Bookings</span>
      </Link>
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-7 h-7",
          },
        }}
      />
    </div>
  );
}
