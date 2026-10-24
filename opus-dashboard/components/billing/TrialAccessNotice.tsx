"use client";

import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatBillingDate } from "@/lib/billing";
import { BILLING_PATH } from "@/lib/upgrade";

export function TrialAccessNotice({
  accessState,
  trialEndsAt,
  canManage,
}: {
  accessState?: "legacy_free" | "trial" | "paid" | "expired";
  trialEndsAt?: number | null;
  canManage: boolean;
}) {
  const { t, locale } = useDashboardI18n();
  if (accessState !== "trial" && accessState !== "expired") return null;
  const expired = accessState === "expired";
  const endDate = trialEndsAt ? formatBillingDate(trialEndsAt, locale) : null;

  return (
    <Alert className="mb-4">
      <AlertTitle data-replay-public>
        {expired
          ? t(
              "Your trial has ended",
              "Пробниот период заврши",
              "Prova juaj ka përfunduar",
            )
          : endDate
            ? t(
                `Your trial ends on ${endDate}`,
                `Пробниот период завршува на ${endDate}`,
                `Prova juaj përfundon më ${endDate}`,
              )
            : t(
                "Your two-month trial",
                "Вашиот двомесечен пробен период",
                "Prova juaj dymujore",
              )}
      </AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p data-replay-public>
          {expired
            ? t(
                "Your existing appointments and data are kept. You can manage existing appointments. A paid plan is needed for new bookings.",
                "Постојните термини и податоци се зачувани. Можете да управувате со постојните термини. За нови закажувања е потребен платен план.",
                "Rezervimet dhe të dhënat ekzistuese ruhen. Mund të menaxhoni rezervimet ekzistuese. Për rezervime të reja nevojitet një plan me pagesë.",
              )
            : t(
                "Your trial includes paid features. A paid subscription is needed for new bookings after the trial ends.",
                "Пробниот период ги вклучува платените функции. По неговото завршување е потребна платена претплата за нови закажувања.",
                "Prova përfshin funksionet me pagesë. Pas përfundimit të saj nevojitet një abonim me pagesë për rezervime të reja.",
              )}
        </p>
        {canManage ? (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={BILLING_PATH}>
              {t("Choose a plan", "Изберете план", "Zgjidhni një plan")}
            </Link>
          </Button>
        ) : expired ? (
          <p data-replay-public className="shrink-0 text-sm">
            {t(
              "Contact your studio owner.",
              "Контактирајте го сопственикот на студиото.",
              "Kontaktoni pronarin e studios.",
            )}
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
