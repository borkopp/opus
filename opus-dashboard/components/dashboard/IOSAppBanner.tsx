"use client";

import { X } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Iphone } from "@/components/ui/iphone";
import { cn } from "@/lib/utils";

export function IOSAppBanner({
  onDismiss,
  withNavigation = false,
}: {
  onDismiss: () => void;
  withNavigation?: boolean;
}) {
  const { t } = useDashboardI18n();

  return (
    <section
      aria-labelledby="ios-app-banner-title"
      className="relative h-full min-w-0"
    >
      <div className="grid h-full grid-cols-[minmax(0,30%)_minmax(0,1fr)] items-center gap-5 px-4 pt-5 @[480px]:gap-6 @[480px]:px-6 @[480px]:pt-6">
        <div
          aria-hidden="true"
          className="aspect-[433/441] w-full max-w-[180px] justify-self-center overflow-hidden"
        >
          <Iphone src="/images/mobile/ios-dashboard.png" />
        </div>
        <div
          className={cn(
            "flex min-w-0 flex-col gap-4",
            withNavigation ? "pb-16" : "pb-5 @[480px]:pb-6",
          )}
        >
          <div className="flex min-w-0 flex-col gap-2 pr-8">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="ios-app-banner-title" className="text-base font-medium">
                {t(
                  "OPUS for iPhone & iPad",
                  "OPUS за iPhone и iPad",
                  "OPUS për iPhone dhe iPad",
                )}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {t(
                "Push alerts for new appointments and cancellations, even when your dashboard is closed.",
                "Push известувања за нови термини и откажувања, дури и кога контролната табла е затворена.",
                "Njoftime push për termine të reja dhe anulime, edhe kur paneli është i mbyllur.",
              )}
            </p>
            <Badge
              variant="secondary"
              className="mt-1 self-start whitespace-normal"
            >
              {t(
                "Coming in a few days",
                "Пристигнува за неколку дена",
                "Vjen pas pak ditësh",
              )}
            </Badge>
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 size-11"
        onClick={onDismiss}
        aria-label={t(
          "Dismiss iOS app announcement",
          "Сокриј ја најавата за iOS апликацијата",
          "Hiq njoftimin për aplikacionin iOS",
        )}
      >
        <X aria-hidden="true" />
      </Button>
    </section>
  );
}
