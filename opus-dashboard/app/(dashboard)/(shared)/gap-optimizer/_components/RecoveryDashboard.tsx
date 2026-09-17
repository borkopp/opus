"use client";

import Link from "next/link";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "@/convex/_generated/dataModel";
import type { api } from "@/convex/_generated/api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { formatPrice } from "@/lib/format-price";
import { GapOptimizerHeader } from "./GapOptimizerHeader";
import { GapList } from "./GapList";
import { RecoveryContacts } from "./RecoveryContacts";

type RecoveryData = FunctionReturnType<
  typeof api.ai.gapOptimizerHelpers.getRecoveryDashboard
>;

export function RecoveryDashboard({
  orgId,
  data,
  onDateChange,
}: {
  orgId: Id<"orgs">;
  data: RecoveryData;
  onDateChange: (date: string) => void;
}) {
  const { t } = useDashboardI18n();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <GapOptimizerHeader
        orgId={orgId}
        date={data.serviceDate}
        today={data.today}
        onDateChange={onDateChange}
        canScan={data.canManage && data.enabled && data.websitePublished}
        lastScanAt={data.lastScanAt}
      />
      {!data.enabled && (
        <Alert>
          <AlertTitle>
            {t("Recovery is off", "Пополнувањето е исклучено")}
          </AlertTitle>
          <AlertDescription>
            <Link href="/settings?tab=gaps" className="underline">
              {t("Enable it in Settings", "Овозможете го во поставките")}
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {data.enabled && !data.websitePublished && (
        <Alert>
          <AlertTitle>
            {t(
              "Publish your studio website",
              "Објавете ја веб-страницата на студиото",
            )}
          </AlertTitle>
          <AlertDescription>
            {t(
              "Clients need a published booking page to accept an offer.",
              "На клиентите им е потребна објавена страница за да ја прифатат понудата.",
            )}
          </AlertDescription>
        </Alert>
      )}
      {data.enabled && !data.emailReady && (
        <Alert>
          <AlertTitle>
            {t(
              "Email delivery needs configuration",
              "Потребна е конфигурација за е-пошта",
            )}
          </AlertTitle>
          <AlertDescription>
            {t(
              "You can review openings and clients. Email approval becomes available when delivery is configured.",
              "Може да ги разгледате термините и клиентите. Одобрувањето пораки ќе биде достапно по конфигурацијата.",
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {data.openCount} {t("openings to review", "термини за преглед")}
          </Badge>
          <Badge variant="outline">
            {data.outreachSentCount} {t("active offers", "активни понуди")}
          </Badge>
          <Badge variant="outline">
            {data.filledCount}{" "}
            {t("attributed bookings", "резервации преку понуди")}
          </Badge>
        </div>
        {data.canManage && <RecoveryContacts orgId={orgId} />}
      </div>
      {data.completedValue.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t(
            "Completed appointment value through offers",
            "Вредност на завршени термини преку понуди",
          )}
          :{" "}
          {data.completedValue
            .map((value) =>
              formatPrice(value.amount, value.currency, data.locale),
            )
            .join(" · ")}
        </p>
      )}
      <GapList orgId={orgId} data={data} />
    </div>
  );
}
