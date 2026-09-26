"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { onboardingError } from "@/lib/i18n/onboarding";
import type { ActivationState } from "@/lib/onboarding";
import { nextWebsiteAction } from "@/lib/website-launch";
import { StepFrame, WizardActions } from "./OnboardingStep";

export function ReviewStep({
  state,
  onBack,
  onPublished,
}: {
  state: ActivationState;
  onBack: () => void;
  onPublished: () => void;
}) {
  const { t, language } = useDashboardI18n();
  const publish = useMutation(api.website.publish);
  const [saving, setSaving] = useState(false);
  const next = nextWebsiteAction(state.websiteRequirements);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await publish({});
      posthog.capture("website_published");
      toast.success(t("Website published", "Веб-страницата е објавена"));
      onPublished();
    } catch (caught) {
      toast.error(onboardingError(caught, language));
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="w-full" onSubmit={submit}>
      <StepFrame
        wide
        replayPublicTitle
        replayPublicDescription
        title={
          state.allWebsiteRequirementsComplete
            ? t(
                "Your booking website is ready",
                "Вашата страница за закажување е подготвена",
              )
            : t("One more step before launch", "Уште еден чекор до објавување")
        }
        description={t(
          "Check your website, then publish your booking link. Add photos, a logo, and more services whenever you’re ready.",
          "Прегледајте ја страницата, па објавете го линкот за закажување. Фотографии, лого и други услуги можете да додадете подоцна.",
        )}
      >
        {!state.allWebsiteRequirementsComplete && (
          <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl border border-border p-4">
            <p data-replay-public className="text-sm">
              {t(
                "Finish this step before accepting bookings.",
                "Завршете го овој чекор пред да примате закажувања.",
              )}
            </p>
            <Button asChild>
              <Link data-replay-public href={next.href}>
                {t(next.label[0], next.label[1])}
              </Link>
            </Button>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="break-all border-b border-border px-4 py-3 text-center font-mono text-xs text-muted-foreground">
            {state.org.slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk"}
          </div>
          <iframe
            src="/onboarding/preview"
            title={t("Your website preview", "Преглед на вашата веб-страница")}
            className="h-[400px] w-full bg-background sm:h-[480px]"
          />
        </div>
        {state.org.websiteStatus === "published" ? (
          <Button asChild className="mt-6 min-h-12 w-full">
            <Link data-replay-public href="/beauty">
              {t("Open dashboard", "Отвори контролна табла")}
            </Link>
          </Button>
        ) : (
          <WizardActions
            canGoBack
            onBack={onBack}
            isSubmitting={saving}
            disabled={!state.allWebsiteRequirementsComplete}
            label={t(
              "Publish my booking website",
              "Објави ја страницата за закажување",
            )}
          />
        )}
      </StepFrame>
    </form>
  );
}
