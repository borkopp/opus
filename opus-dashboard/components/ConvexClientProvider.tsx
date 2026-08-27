"use client";

import { ReactNode } from "react";
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
  return (
    <ConvexBetterAuthProvider client={convex} authClient={convexAuthClient}>
      <SyncUser />
      {children}
    </ConvexBetterAuthProvider>
  );
}
