"use client";

import { Monitor, X } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useDismissibleBanner } from "@/hooks/use-dismissible-banner";

export function WebsiteEditorMobileNotice() {
  const { t } = useDashboardI18n();
  const { dismissed, dismiss } = useDismissibleBanner(
    "opus-sites-desktop-tip-dismissed-v1",
  );

  if (dismissed) return null;

  return (
    <Alert
      role="status"
      className="sites-mobile-notice shrink-0 rounded-none border-0 border-b bg-secondary/60 pr-14"
      aria-label={t(
        "Desktop editing recommendation",
        "Препорака за уредување на компјутер",
        "Rekomandim për redaktim në kompjuter",
      )}
    >
      <Monitor aria-hidden="true" />
      <AlertTitle className="line-clamp-none">
        {t("Better on desktop", "Подобро на компјутер", "Më mirë në kompjuter")}
      </AlertTitle>
      <AlertDescription>
        {t(
          "A bigger screen gives you more space for the controls and live preview.",
          "На поголем екран имате повеќе простор за контролите и прегледот во живо.",
          "Një ekran më i madh ju jep më shumë hapësirë për kontrollet dhe pamjen paraprake.",
        )}
      </AlertDescription>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1 size-11"
        onClick={dismiss}
        aria-label={t(
          "Dismiss desktop recommendation",
          "Сокриј ја препораката за компјутер",
          "Hiqni rekomandimin për kompjuter",
        )}
      >
        <X aria-hidden="true" />
      </Button>
    </Alert>
  );
}
