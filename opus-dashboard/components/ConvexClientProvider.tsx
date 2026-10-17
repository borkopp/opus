"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ConvexReactClient, ConvexProviderWithAuth } from "convex/react";
import { useConvexSession } from "@/hooks/use-convex-session";
import { SessionRecoveryContext } from "@/hooks/use-session-recovery";
import { SyncUser } from "./SyncUser";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
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
    <AuthenticatedProvider initialToken={initialToken}>
      {children}
    </AuthenticatedProvider>
  );
}

function AuthenticatedProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  const { useAuth, recovery } = useConvexSession(initialToken);
  return (
    <SessionRecoveryContext.Provider value={recovery}>
      <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
        <SyncUser />
        {children}
      </ConvexProviderWithAuth>
    </SessionRecoveryContext.Provider>
  );
}
