"use client";

import Link from "next/link";
import { Store } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function OnboardingHeader({
  dashboardHref,
}: {
  dashboardHref?: string;
}) {
  const { t, language, setLanguage } = useDashboardI18n();
  return (
    <header className="px-4 py-4 sm:px-8 sm:py-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Logo className="text-2xl" />
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            value={language}
            variant="outline"
            size="sm"
            aria-label={t("Language", "Јазик", "Gjuha")}
            onValueChange={(value) => {
              if (value === "en" || value === "mk" || value === "sq")
                setLanguage(value);
            }}
          >
            <ToggleGroupItem value="en" aria-label="Switch to English">
              EN
            </ToggleGroupItem>
            <ToggleGroupItem value="mk" aria-label="Промени на македонски">
              МК
            </ToggleGroupItem>
            <ToggleGroupItem value="sq" aria-label="Kalo në shqip">
              SQ
            </ToggleGroupItem>
          </ToggleGroup>
          {dashboardHref && (
            <Button asChild variant="ghost">
              <Link href={dashboardHref}>
                <Store data-icon="inline-start" />
                <span data-replay-public className="sr-only sm:not-sr-only">
                  {t("Dashboard", "Контролна табла", "Paneli")}
                </span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
