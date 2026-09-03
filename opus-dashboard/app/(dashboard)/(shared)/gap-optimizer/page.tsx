"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { GapOptimizerHeader } from "./_components/GapOptimizerHeader";
import { GapList } from "./_components/GapList";
import { redirect } from "next/navigation";
import { ACTIVE_CAPABILITIES } from "@/lib/product-scope";
import { motion } from "framer-motion";
import { PaidFeatureOverlay } from "@/components/ui/paid-feature-overlay";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

function GapOptimizerContent() {
    const { t } = useDashboardI18n();
    const { isAuthenticated, isLoading } = useConvexAuth();
    const profile = useQuery(
        api.users.getMyProfile,
        isAuthenticated ? {} : "skip",
    );
    const orgId = profile?.orgId;
    const isPaid = profile?.plan === "paid";

    const openGaps = useQuery(
        api.ai.gapOptimizerHelpers.getOpenGapsForOrg,
        orgId && isPaid ? { orgId } : "skip",
    );

    if (isLoading || profile === undefined || (isPaid && openGaps === undefined)) {
        return (
            <div className="flex h-[400px] w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
            </div>
        );
    }

    if (!orgId) return null;

    return (
        <PaidFeatureOverlay
            locked={!isPaid}
            featureLabel={t(
                "Gap optimizer requires OPUS Pro",
                "Оптимизаторот на празни термини бара OPUS Pro",
            )}
            className="mx-auto flex min-h-full w-full max-w-5xl flex-1"
            contentClassName="flex min-h-full w-full flex-1"
        >
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 w-full max-w-5xl mx-auto flex-1 min-h-full"
        >
            <GapOptimizerHeader orgId={orgId} />
            <div className="flex-1 overflow-y-auto">
                <GapList gaps={openGaps ?? []} orgId={orgId} />
            </div>
        </motion.div>
        </PaidFeatureOverlay>
    );
}

export default function GapOptimizerPage() {
    if (!ACTIVE_CAPABILITIES.automatedGapOptimizer) redirect("/beauty");
    return <GapOptimizerContent />;
}
