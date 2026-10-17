"use client";

import { Spinner } from "@/components/ui/spinner";

export default function DashboardIndex() {
  // The routing logic is completely handled by app/(dashboard)/layout.tsx.
  // - If not logged in -> /login
  // - If no org -> /onboarding
  // - If has org -> the active beauty workspace
  // This page just prevents the 404 at "/" while the layout runs its useEffect.
  return (
    <div className="flex flex-col h-full bg-background items-center justify-center">
      <Spinner className="size-8 text-brand" />
    </div>
  );
}
