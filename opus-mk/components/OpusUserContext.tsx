"use client";

import { createContext, useContext, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
  const { isLoaded, isSignedIn, user } = useUser();
  const getOrCreate = useMutation(api.opusUsers.getOrCreate);
  const linkSession = useMutation(api.marketplace.conversations.linkSessionToOpusUser);
  const [synced, setSynced] = useState(false);
  const [syncedUserId, setSyncedUserId] = useState<Id<"opus_users"> | null>(null);

  // Upsert opus_users record on sign-in
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || synced) return;

    getOrCreate({
      clerkId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? "",
      name: user.fullName ?? user.firstName ?? "User",
      phone: user.primaryPhoneNumber?.phoneNumber,
      avatarUrl: user.imageUrl,
    })
      .then((id) => {
        setSyncedUserId(id);
        setSynced(true);
        // Link any in-progress marketplace chat session to this user
        const sessionId =
          typeof window !== "undefined"
            ? localStorage.getItem("opus_chat_session")
            : null;
        if (sessionId) {
          linkSession({ sessionId, opusUserId: id }).catch(() => {});
        }
      })
      .catch(console.error);
  }, [isLoaded, isSignedIn, user, synced, getOrCreate, linkSession]);

  // Reset on sign-out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setSynced(false);
      setSyncedUserId(null);
    }
  }, [isLoaded, isSignedIn]);

  // Query the opus_users record once synced
  const opusUser = useQuery(
    api.opusUsers.getByClerkId,
    isSignedIn && user ? { clerkId: user.id } : "skip"
  );

  const isLoading = !isLoaded || (isSignedIn && !synced);

  const value: OpusUserContextValue = {
    isLoading,
    isAuthenticated: !!isSignedIn && synced && !!opusUser,
    opusUserId: opusUser?._id ?? syncedUserId,
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
