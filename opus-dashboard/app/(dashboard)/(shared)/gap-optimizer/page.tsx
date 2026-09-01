"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GapOptimizerHeader } from "./_components/GapOptimizerHeader";
import { GapList } from "./_components/GapList";
import { redirect } from "next/navigation";
import { ACTIVE_CAPABILITIES } from "@/lib/product-scope";
import { motion } from "framer-motion";

function GapOptimizerContent() {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const profile = useQuery(
        api.users.getMyProfile,
        isAuthenticated ? {} : "skip",
    );
    const orgId = profile?.orgId;

    const openGaps = useQuery(api.ai.gapOptimizerHelpers.getOpenGapsForOrg, orgId ? { orgId } : "skip");

    if (isLoading || profile === undefined || openGaps === undefined) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
        );
    }

    if (!orgId) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 w-full max-w-5xl mx-auto flex-1 min-h-full"
        >
            <GapOptimizerHeader orgId={orgId} />
            <div className="flex-1 overflow-y-auto">
                <GapList gaps={openGaps} orgId={orgId} />
            </div>
        </motion.div>
    );
}

export default function GapOptimizerPage() {
    if (!ACTIVE_CAPABILITIES.automatedGapOptimizer) redirect("/beauty");
    return <GapOptimizerContent />;
}
