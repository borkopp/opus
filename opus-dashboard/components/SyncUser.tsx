"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";

export function SyncUser() {
    const { isLoaded, isSignedIn } = useUser();
    const ensureUser = useMutation(api.users.ensureUser);
    const [hasSynced, setHasSynced] = useState(false);

    useEffect(() => {
        if (!isLoaded) return;

        if (isSignedIn && !hasSynced) {
            ensureUser()
                .then(() => setHasSynced(true))
                .catch(console.error);
        } else if (!isSignedIn) {
            setHasSynced(false);
        }
    }, [isLoaded, isSignedIn, hasSynced, ensureUser]);

    return null;
}
