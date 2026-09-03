import type { FunctionReturnType } from "convex/server";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetTitle } from "@/components/dashboard/WidgetTitle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";

type CustomerInsights = FunctionReturnType<
  typeof api.dashboard.getCustomerInsights
>;
type TopCustomer = FunctionReturnType<
  typeof api.dashboard.getTopCustomers
>[number];
type NoShowRisk = FunctionReturnType<typeof api.dashboard.getNoShowStats>;

export function CustomerInsightsWidget({
  insights,
  topCustomers,
  noShowRisk,
  formatMoney,
  revenueToday,
  bookingsToday,
}: {
  insights: CustomerInsights;
  topCustomers: TopCustomer[];
  noShowRisk: NoShowRisk;
  formatMoney: (minorUnits: number) => string;
  revenueToday: number;
  bookingsToday: number;
}) {
  const { locale, t } = useDashboardI18n();
  const topCustomer = topCustomers.find(
    (customer) => customer.totalSpendMinorUnits > 0,
  );
  const noShowRiskCount = noShowRisk?.customers?.length ?? 0;
  const hasAttentionItems = insights.atRiskChurn > 0 || noShowRiskCount > 0;

  return (
    <Card className="gap-0 overflow-hidden md:h-full">
      <CardHeader className="shrink-0 pb-4">
        <CardTitle>
          <WidgetTitle>{t("Customer insights", "Увид во клиенти")}</WidgetTitle>
        </CardTitle>
        <CardDescription>
          {t("Today and this month", "Денес и овој месец")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-5">
        <section aria-labelledby="customer-growth-heading">
          <h3 id="customer-growth-heading" className="sr-only">
            {t("Customer growth this month", "Раст на клиенти овој месец")}
          </h3>
          <div className="flex items-end gap-3">
            <span className="font-display text-5xl font-semibold leading-none tracking-tight text-foreground">
              {insights.newThisMonth.toLocaleString(locale)}
            </span>
            <p className="max-w-32 pb-0.5 text-sm font-medium leading-snug text-foreground">
              {insights.newThisMonth === 1
                ? t(
                    "new customer joined this month",
                    "нов клиент се зачлени овој месец",
                  )
                : t(
                    "new customers joined this month",
                    "нови клиенти се зачленија овој месец",
                  )}
            </p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {formatReturningCustomers(insights.returningThisMonth, locale, t)}
          </p>
        </section>

        <Separator />

        <section
          aria-labelledby="today-heading"
          className="flex flex-col gap-3"
        >
          <h3
            id="today-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {t("Today", "Денес")}
          </h3>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("Appointments", "Термини")}
              </dt>
              <dd className="font-display text-base font-semibold tabular-nums text-foreground">
                {bookingsToday.toLocaleString(locale)}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">
                {t("Revenue", "Приход")}
              </dt>
              <dd className="font-display text-base font-semibold tabular-nums text-foreground">
                {formatMoney(revenueToday)}
              </dd>
            </div>
          </dl>
        </section>

        {topCustomer && (
          <>
            <Separator />
            <section
              aria-labelledby="top-customer-heading"
              className="flex flex-col gap-2"
            >
              <h3
                id="top-customer-heading"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t("Top customer", "Најдобар клиент")}
              </h3>
              <div className="flex items-center justify-between gap-4 text-sm">
                <p className="truncate font-medium text-foreground">
                  {topCustomer.name}
                </p>
                <p className="shrink-0 font-display font-semibold tabular-nums text-foreground">
                  {formatMoney(topCustomer.totalSpendMinorUnits)}
                </p>
              </div>
            </section>
          </>
        )}

        {hasAttentionItems && (
          <>
            <Separator />
            <section
              aria-labelledby="attention-heading"
              className="flex flex-col gap-2"
            >
              <h3
                id="attention-heading"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {t("Needs attention", "Потребно е внимание")}
              </h3>
              {noShowRiskCount > 0 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground">
                    {t("Potential no-shows", "Потенцијални непојавувања")}
                  </span>
                  <Badge variant="highlight">{noShowRiskCount}</Badge>
                </div>
              )}
              {insights.atRiskChurn > 0 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground">
                    {t("At-risk customers", "Ризични клиенти")}
                  </span>
                  <Badge variant="danger">{insights.atRiskChurn}</Badge>
                </div>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatReturningCustomers(
  count: number,
  locale: string,
  t: (en: string, mk: string) => string,
) {
  if (count === 0)
    return t("No returning customers yet.", "Сè уште нема повратни клиенти.");
  if (count === 1)
    return t(
      "1 customer returned this month.",
      "1 клиент се врати овој месец.",
    );
  return t(
    `${count.toLocaleString(locale)} customers returned this month.`,
    `${count.toLocaleString(locale)} клиенти се вратија овој месец.`,
  );
}
