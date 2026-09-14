import { Building2, CalendarDays, Globe2, HardDrive } from "lucide-react";
import type { OwnerOverview } from "../../../shared/owner-overview";
import { bytes, number } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OverviewMetrics({ data }: { data: OwnerOverview }) {
  const { totals: t } = data;
  const metrics = [
    {
      title: "Businesses",
      value: number(t.businesses),
      detail: `${number(t.newBusinesses30d)} joined in the last 30 days`,
      icon: Building2,
    },
    {
      title: "Websites published",
      value: number(t.published),
      detail: `${t.businesses ? Math.round((t.published / t.businesses) * 100) : 0}% published · ${number(t.suspended)} suspended`,
      icon: Globe2,
    },
    {
      title: "Paid businesses",
      value: number(t.paid),
      detail: `${number(t.businesses - t.paid)} on the free plan`,
      icon: CalendarDays,
    },
    {
      title: "Total file storage",
      value: bytes(t.storedBytes),
      detail: `${number(t.storedFiles)} files in this deployment`,
      icon: HardDrive,
    },
  ];
  const maxSignups = Math.max(1, ...data.signups.map((month) => month.count));
  return (
    <>
      <section
        aria-label="Key metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(({ title, value, detail, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <CardDescription className="flex items-center justify-between gap-2">
                {title}
                <Icon className="size-4" aria-hidden="true" />
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold tracking-tight tabular-nums">
                {value}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <section
        aria-label="Growth and usage"
        className="grid gap-4 lg:grid-cols-3"
      >
        <Card>
          <CardHeader>
            <CardTitle>New businesses</CardTitle>
            <CardDescription>
              Last six calendar months · current month to date
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {data.signups.map(({ month, count }) => (
              <div className="flex items-center gap-3 text-xs" key={month}>
                <span className="w-12 text-muted-foreground">
                  {new Intl.DateTimeFormat("en-GB", {
                    month: "short",
                    timeZone: "UTC",
                  }).format(new Date(`${month}-01T00:00:00Z`))}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(count / maxSignups) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums">
                  {number(count)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Business activity</CardTitle>
            <CardDescription>
              Bookings created in the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4 text-sm">
              {[
                ["New bookings", t.bookings30d],
                ["Of those, cancelled", t.cancelled30d],
                ["Businesses with new bookings", t.activeBusinesses30d],
                ["Bookings · all time", t.bookings],
                ["Customer records", t.customers],
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between gap-2"
                  key={label}
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums">
                    {number(Number(value))}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Images & resources</CardTitle>
            <CardDescription>
              Current business content and stored uploads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4 text-sm">
              {[
                [
                  "Stored image files",
                  `${number(t.storedImages)} · ${bytes(t.storedImageBytes)}`,
                ],
                [
                  "Images linked to businesses",
                  `${number(t.linkedImages)} · ${bytes(t.linkedImageBytes)}`,
                ],
                ["External images · size unknown", number(t.externalImages)],
                ["Active services", number(t.services)],
                ["Active staff", number(t.staff)],
              ].map(([label, value]) => (
                <div
                  className="flex items-center justify-between gap-2"
                  key={label}
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
