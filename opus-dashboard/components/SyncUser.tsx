"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";

export function SyncUser() {
    const { isLoaded, isSignedIn, user } = useUser();
    const ensureUser = useMutation(api.users.ensureUser);
    const syncedUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isLoaded || !isSignedIn || !user?.id) return;
        if (syncedUserIdRef.current === user.id) return;

        syncedUserIdRef.current = user.id;
        void ensureUser().catch((error: unknown) => {
            syncedUserIdRef.current = null;
            console.error("Failed to synchronize the signed-in user", error);
        });
    }, [ensureUser, isLoaded, isSignedIn, user?.id]);

    return null;
}
