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
    <div className="flex w-full flex-col gap-6">
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
          <AlertTitle data-replay-public>
            {t("Recovery is off", "Пополнувањето е исклучено", "Rikuperimi është joaktiv")}
          </AlertTitle>
          <AlertDescription>
            <Link
              data-replay-public
              href="/settings?tab=gaps"
              className="underline"
            >
              {t("Enable it in Settings", "Овозможете го во поставките", "Aktivizojeni te Cilësimet")}
            </Link>
          </AlertDescription>
        </Alert>
      )}
      {data.enabled && !data.websitePublished && (
        <Alert>
          <AlertTitle data-replay-public>
            {t(
              "Publish your studio website",
              "Објавете ја веб-страницата на студиото",
              "Publikoni uebsajtin e studios suaj",
            )}
          </AlertTitle>
          <AlertDescription data-replay-public>
            {t(
              "Clients need a published booking page to accept an offer.",
              "На клиентите им е потребна објавена страница за да ја прифатат понудата.",
              "Klientët kanë nevojë për një faqe të publikuar rezervimesh për të pranuar ofertën.",
            )}
          </AlertDescription>
        </Alert>
      )}
      {data.enabled && !data.emailReady && (
        <Alert>
          <AlertTitle data-replay-public>
            {t(
              "Email delivery needs configuration",
              "Потребна е конфигурација за е-пошта",
              "Dërgimi i email-eve kërkon konfigurim",
            )}
          </AlertTitle>
          <AlertDescription data-replay-public>
            {t(
              "You can review openings and clients. Email approval becomes available when delivery is configured.",
              "Може да ги разгледате термините и клиентите. Одобрувањето пораки ќе биде достапно по конфигурацијата.",
              "Mund të shqyrtoni hapësirat dhe klientët. Miratimi i email-eve bëhet i disponueshëm kur konfigurohet dërgimi.",
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {data.openCount} {t("openings to review", "термини за преглед", "hapësira për shqyrtim")}
          </Badge>
          <Badge variant="outline">
            {data.outreachSentCount} {t("active offers", "активни понуди", "oferta aktive")}
          </Badge>
          <Badge variant="outline">
            {data.filledCount}{" "}
            {t("attributed bookings", "резервации преку понуди", "rezervime nga ofertat")}
          </Badge>
        </div>
        {data.canManage && <RecoveryContacts orgId={orgId} />}
      </div>
      {data.completedValue.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {t(
            "Completed appointment value through offers",
            "Вредност на завршени термини преку понуди",
            "Vlera e termineve të përfunduara përmes ofertave",
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
