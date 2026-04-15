"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { GapOptimizerHeader } from "./_components/GapOptimizerHeader";
import { GapList } from "./_components/GapList";

export default function GapOptimizerPage() {
    const { isLoaded, isSignedIn } = useUser();
    const profile = useQuery(api.users.getMyProfile);
    const orgId = profile?.orgId;

    const openGaps = useQuery(api.ai.gapOptimizerHelpers.getOpenGapsForOrg, orgId ? { orgId } : "skip");

    if (!isLoaded || profile === undefined || openGaps === undefined) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!orgId) return null;

    return (
        <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto h-[calc(100vh-150px)]">
            <GapOptimizerHeader orgId={orgId} />
            <div className="flex-1 overflow-y-auto">
                <GapList gaps={openGaps} orgId={orgId} />
            </div>
        </div>
    );
}
