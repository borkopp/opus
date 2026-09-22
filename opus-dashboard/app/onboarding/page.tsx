import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { OnboardingWizard } from "./_components/OnboardingWizard";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Spinner className="size-8" />
        </div>
      }
    >
      <OnboardingWizard />
    </Suspense>
  );
}
