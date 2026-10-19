"use client";

import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

export function NotificationLoading({ rows = 4 }: { rows?: number }) {
  const { t } = useDashboardI18n();
  return (
    <div
      role="status"
      aria-label={t(
        "Loading notifications…",
        "Вчитување известувања…",
        "Po ngarkohen njoftimet…",
      )}
      className="min-w-0 divide-y divide-border/40"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden="true" className="flex min-w-0 gap-3 p-4">
          <Skeleton className="size-8 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationEmpty({
  unread = false,
  filtered = false,
  moreAvailable = false,
}: {
  unread?: boolean;
  filtered?: boolean;
  moreAvailable?: boolean;
}) {
  const { t } = useDashboardI18n();
  return (
    <div
      className="flex flex-col items-center px-5 py-10 text-center"
      role="status"
    >
      <Bell aria-hidden="true" className="mb-3 size-6 text-muted-foreground" />
      <p className="text-sm font-semibold">
        {moreAvailable
          ? t(
              "No matches on this page",
              "Нема резултати на оваа страница",
              "Nuk ka rezultate në këtë faqe",
            )
          : unread
            ? t("All caught up", "Сè е прочитано", "Të gjitha u lexuan")
            : t(
                "No notifications yet",
                "Сè уште нема известувања",
                "Ende nuk ka njoftime",
              )}
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {moreAvailable
          ? t(
              "Load more to check earlier updates.",
              "Вчитај повеќе за да ги провериш постарите известувања.",
              "Ngarkoni më shumë për të parë përditësimet e mëparshme.",
            )
          : unread
            ? t(
                "You've read all updates in this view.",
                "Ги прочита сите известувања во овој преглед.",
                "I keni lexuar të gjitha përditësimet në këtë pamje.",
              )
            : filtered
              ? t(
                  "Try another category or check back later.",
                  "Избери друга категорија или провери подоцна.",
                  "Provoni një kategori tjetër ose kontrolloni më vonë.",
                )
              : t(
                  "Booking updates will appear here.",
                  "Новостите за термините ќе се појават тука.",
                  "Përditësimet e termineve do të shfaqen këtu.",
                )}
      </p>
    </div>
  );
}

export function NotificationActionError({
  failed,
  retry,
}: {
  failed: boolean;
  retry: () => Promise<boolean>;
}) {
  const { t } = useDashboardI18n();
  if (!failed) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm"
    >
      <p className="min-w-0 flex-1">
        {t(
          "The update couldn't be saved. Check your connection and retry.",
          "Промената не се зачува. Провери ја врската и обиди се повторно.",
          "Ndryshimi nuk u ruajt. Kontrolloni lidhjen dhe provoni përsëri.",
        )}
      </p>
      <Button
        variant="outline"
        className="min-h-11"
        onClick={() => void retry()}
      >
        {t("Retry", "Обиди се повторно", "Provoni përsëri")}
      </Button>
    </div>
  );
}

export function MarkAllNotificationsRead({
  pending,
  disabled,
  onClick,
}: {
  pending: boolean;
  disabled?: boolean;
  onClick: () => Promise<boolean>;
}) {
  const { t } = useDashboardI18n();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || pending}
      aria-busy={pending}
      className="min-h-11 max-w-full whitespace-normal text-left"
      onClick={() => void onClick()}
    >
      {pending ? (
        <Loader2
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Check aria-hidden="true" className="size-4" />
      )}
      {t(
        "Mark all read",
        "Означи ги сите како прочитани",
        "Shënoji të gjitha si të lexuara",
      )}
    </Button>
  );
}
