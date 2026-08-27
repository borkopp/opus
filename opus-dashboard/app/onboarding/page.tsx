import { Suspense } from "react";
import { OnboardingWizard } from "./_components/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
