"use client";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { IOSAppBanner } from "@/components/dashboard/IOSAppBanner";
import { useDismissibleBanner } from "@/hooks/use-dismissible-banner";

export function DashboardAnnouncementCarousel() {
  const { t } = useDashboardI18n();
  const ios = useDismissibleBanner("opus-ios-coming-soon-dismissed-v1");

  if (ios.dismissed) return null;

  return (
    <section
      aria-label={t(
        "Studio announcements",
        "Најави за студиото",
        "Njoftime për studion",
      )}
      className="dashboard-setup-banner @container relative mb-4 min-w-0 shrink-0 overflow-hidden rounded-[25px] bg-card"
    >
      <IOSAppBanner onDismiss={ios.dismiss} />
    </section>
  );
}
