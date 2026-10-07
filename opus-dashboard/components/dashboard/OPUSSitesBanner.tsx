"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function OPUSSitesBanner({
  onDismiss,
  withNavigation = false,
}: {
  onDismiss: () => void;
  withNavigation?: boolean;
}) {
  const { t } = useDashboardI18n();

  return (
    <section
      aria-labelledby="opus-sites-banner-title"
      className="relative h-full min-w-0"
    >
      <div className="grid h-full @[480px]:grid-cols-[min(30%,240px)_minmax(0,1fr)]">
        <div className="relative min-w-0 overflow-hidden">
          <Image
            src="/images/website/opus-sites-editor.png"
            alt={t(
              "Website Editor with design palettes and a live website preview",
              "Уредник за веб-страници со палети за дизајн и преглед на веб-страницата во живо",
              "Redaktuesi i faqes me paleta dizajni dhe pamje paraprake të faqes në kohë reale",
            )}
            width={2190}
            height={1394}
            loading="eager"
            sizes="(max-width: 640px) 100vw, 240px"
            className="h-auto w-full object-cover object-left-top @[480px]:absolute @[480px]:inset-0 @[480px]:h-full"
          />
        </div>
        <div
          className={cn(
            "flex min-w-0 flex-col items-start justify-center gap-3 p-5 pr-12 @[480px]:p-6 @[480px]:pr-14",
            withNavigation && "pb-16 @[480px]:pb-16",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="opus-sites-banner-title" className="text-base font-medium">
              {t(
                "Website Editor",
                "Уредник за веб-страници",
                "Redaktuesi i faqes",
              )}
            </h2>
            <Badge variant="secondary">{t("New", "Ново", "E re")}</Badge>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t(
              "Make your website feel like your studio. Choose themes, edit sections, and see every change live.",
              "Направете ја веб-страницата во стилот на вашето студио. Изберете тема, уредете ги секциите и гледајте ја секоја промена во живо.",
              "Jepini faqes suaj stilin e studios. Zgjidhni tema, ndryshoni seksionet dhe shihni çdo ndryshim në kohë reale.",
            )}
          </p>
          <Button asChild size="sm" className="mt-1 min-h-11">
            <Link href="/website">
              {t("Check it out", "Разгледај", "Shiko")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 size-11"
        onClick={onDismiss}
        aria-label={t(
          "Dismiss Website Editor announcement",
          "Сокриј ја најавата за уредникот за веб-страници",
          "Hiq njoftimin për redaktuesin e faqes",
        )}
      >
        <X aria-hidden="true" />
      </Button>
    </section>
  );
}
