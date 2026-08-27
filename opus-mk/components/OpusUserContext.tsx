"use client";

import { createContext, useContext, ReactNode } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────
// OpusUserContext
//
// Provides the signed-in consumer's opus_users identity
// to downstream components (booking flow, My Bookings).
//
// When not signed in, all values are null/false.
// ─────────────────────────────────────────────────────

interface OpusUserContextValue {
  /** Whether the context is still loading */
  isLoading: boolean;
  /** Whether the user is signed in and synced */
  isAuthenticated: boolean;
  /** The opus_users document ID */
  opusUserId: Id<"opus_users"> | null;
  /** The full opus_users record */
  opusUser: {
    _id: Id<"opus_users">;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  } | null;
}

const Ctx = createContext<OpusUserContextValue>({
  isLoading: true,
  isAuthenticated: false,
  opusUserId: null,
  opusUser: null,
});

export function useOpusUser() {
  return useContext(Ctx);
}

export function OpusUserProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated: hasAuthSession, isLoading: isAuthLoading } =
    useConvexAuth();
  const { data: session, isPending: isSessionLoading } =
    authClient.useSession();
  const authUserId = session?.user.id ?? null;
  const getOrCreate = useMutation(api.opusUsers.getOrCreate);
  const [syncedAccount, setSyncedAccount] = useState<{
    authUserId: string;
    opusUserId: Id<"opus_users">;
  } | null>(null);

  // Upsert opus_users record on sign-in
  useEffect(() => {
    if (
      isAuthLoading ||
      isSessionLoading ||
      !hasAuthSession ||
      !authUserId ||
      syncedAccount?.authUserId === authUserId
    ) {
      return;
    }

    let cancelled = false;

    getOrCreate({})
      .then((id) => {
        if (cancelled) return;
        setSyncedAccount({ authUserId, opusUserId: id });
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [
    authUserId,
    getOrCreate,
    hasAuthSession,
    isAuthLoading,
    isSessionLoading,
    syncedAccount?.authUserId,
  ]);

  // Query the opus_users record once synced
  const opusUser = useQuery(
    api.opusUsers.getCurrent,
    hasAuthSession && authUserId ? {} : "skip",
  );

  const isSynced = syncedAccount?.authUserId === authUserId;
  const isLoading =
    isAuthLoading ||
    isSessionLoading ||
    (hasAuthSession && (!isSynced || opusUser === undefined));

  const value: OpusUserContextValue = {
    isLoading,
    isAuthenticated: hasAuthSession && isSynced && !!opusUser,
    opusUserId: opusUser?._id ?? (isSynced ? syncedAccount.opusUserId : null),
    opusUser: opusUser
      ? {
          _id: opusUser._id,
          name: opusUser.name,
          email: opusUser.email,
          phone: opusUser.phone,
          avatarUrl: opusUser.avatarUrl,
        }
      : null,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
