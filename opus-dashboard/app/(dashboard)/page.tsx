"use client";

export default function DashboardIndex() {
    // The routing logic is completely handled by app/(dashboard)/layout.tsx.
    // - If not logged in -> /login
    // - If no org -> /onboarding
    // - If has org -> the active beauty workspace
    // This page just prevents the 404 at "/" while the layout runs its useEffect.
    return (
        <div className="flex flex-col h-full bg-background items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
}
