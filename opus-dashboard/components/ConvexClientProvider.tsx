"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { convexAuthClient } from "@/lib/auth-client";
import { SyncUser } from "./SyncUser";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  // The development-only design sandbox must not connect to live studio data.
  if (
    process.env.NODE_ENV === "development" &&
    (pathname === "/dashboard-preview" ||
      pathname.startsWith("/dashboard-preview/"))
  ) {
    return <>{children}</>;
  }

  return (
    <ConvexBetterAuthProvider client={convex} authClient={convexAuthClient}>
      <SyncUser />
      {children}
    </ConvexBetterAuthProvider>
  );
}
