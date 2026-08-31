import type { FunctionReturnType } from "convex/server";

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
  const topCustomer = topCustomers.find(
    (customer) => customer.totalSpendMinorUnits > 0,
  );
  const noShowRiskCount = noShowRisk?.customers?.length ?? 0;
  const hasAttentionItems = insights.atRiskChurn > 0 || noShowRiskCount > 0;

  return (
    <Card className="gap-0 overflow-hidden md:h-full">
      <CardHeader className="shrink-0 pb-4">
        <CardTitle>
          <WidgetTitle>Customer insights</WidgetTitle>
        </CardTitle>
        <CardDescription>Today and this month</CardDescription>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-5">
        <section aria-labelledby="customer-growth-heading">
          <h3 id="customer-growth-heading" className="sr-only">
            Customer growth this month
          </h3>
          <div className="flex items-end gap-3">
            <span className="font-display text-5xl font-semibold leading-none tracking-tight text-foreground">
              {insights.newThisMonth.toLocaleString()}
            </span>
            <p className="max-w-32 pb-0.5 text-sm font-medium leading-snug text-foreground">
              new customer{insights.newThisMonth === 1 ? "" : "s"} joined this
              month
            </p>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {formatReturningCustomers(insights.returningThisMonth)}
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
            Today
          </h3>
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Appointments</dt>
              <dd className="font-display text-base font-semibold tabular-nums text-foreground">
                {bookingsToday.toLocaleString()}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Revenue</dt>
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
                Top customer
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
                Needs attention
              </h3>
              {noShowRiskCount > 0 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground">Potential no-shows</span>
                  <Badge variant="highlight">{noShowRiskCount}</Badge>
                </div>
              )}
              {insights.atRiskChurn > 0 && (
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-foreground">At-risk customers</span>
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

function formatReturningCustomers(count: number) {
  if (count === 0) return "No returning customers yet.";
  if (count === 1) return "1 customer returned this month.";
  return `${count.toLocaleString()} customers returned this month.`;
}
