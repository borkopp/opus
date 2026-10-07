import type { FunctionReturnType } from "convex/server";
import { CalendarDays, CreditCard, Check } from "lucide-react";
import type { api } from "@/convex/_generated/api";
import { LogoMark } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { formatPrice } from "@/lib/format-price";
import { formatBillingDate } from "@/lib/billing";

export function BillingPlanSummary({
  data,
}: {
  data: FunctionReturnType<typeof api.billing.getStatus>;
}) {
  const { t, locale } = useDashboardI18n();
  const paid = data.plan === "paid";
  const subscription = data.subscription;

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background">
      <div className="flex flex-col gap-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            data-replay-public
            className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
          >
            {t("Your current plan", "Вашиот тековен план", "Plani juaj aktual")}
          </p>
          <Badge
            variant={paid ? "success" : "secondary"}
            style={
              paid
                ? {
                    backgroundColor: "#dcfce7",
                    borderColor: "#86efac",
                    color: "#166534",
                  }
                : undefined
            }
          >
            {paid && <Check data-icon="inline-start" />}
            {paid
              ? t("Active", "Активен", "Aktiv")
              : t("Free plan", "Бесплатен план", "Plani falas")}
          </Badge>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-card text-primary sm:size-14">
            <LogoMark className="h-6 sm:h-8" />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <h3
              data-replay-public
              className="text-2xl font-medium tracking-tight sm:text-4xl"
            >
              OPUS {paid ? "Pro" : "Free"}
            </h3>
            <p
              data-replay-public
              className="text-sm leading-5 text-muted-foreground"
            >
              {paid
                ? t(
                    "More tools for your studio.",
                    "Повеќе алатки за вашето студио.",
                    "Më shumë mjete për studion tuaj.",
                  )
                : t(
                    "Everything you need to start taking bookings.",
                    "Сè што ви треба за да започнете со закажувања.",
                    "Gjithçka që ju nevojitet për të filluar me rezervimet.",
                  )}
            </p>
          </div>
        </div>
      </div>
      <dl className="grid divide-y divide-border/60 border-t border-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6">
          <dt
            data-replay-public
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <CreditCard className="size-4" aria-hidden="true" />
            {t("Subscription price", "Цена на претплатата", "Çmimi i abonimit")}
          </dt>
          <dd className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-medium tabular-nums tracking-tight">
              {subscription
                ? formatPrice(
                    subscription.amount,
                    subscription.currency,
                    locale,
                  )
                : paid
                  ? t("Pro enabled", "Pro е активиран", "Pro i aktivizuar")
                  : formatPrice(0, "MKD", locale, false)}
            </span>
            {subscription && (
              <span
                data-replay-public
                className="text-xs text-muted-foreground"
              >
                / {t("month", "месечно", "muaj")}
              </span>
            )}
          </dd>
        </div>
        <div className="flex min-w-0 flex-col gap-3 p-5 sm:p-6">
          <dt
            data-replay-public
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            {subscription
              ? subscription.cancelAtPeriodEnd
                ? t("Access until", "Пристап до", "Qasje deri më")
                : t(
                    "Current period ends",
                    "Тековниот период завршува",
                    "Periudha aktuale përfundon",
                  )
              : t("Billing", "Наплата", "Faturimi")}
          </dt>
          <dd className="text-xl font-medium tabular-nums tracking-tight">
            {subscription
              ? formatBillingDate(subscription.currentPeriodEnd, locale)
              : paid
                ? t(
                    "No online subscription",
                    "Без онлајн претплата",
                    "Pa abonim në internet",
                  )
                : t(
                    "No payment required",
                    "Без плаќање",
                    "Nuk kërkohet pagesë",
                  )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
