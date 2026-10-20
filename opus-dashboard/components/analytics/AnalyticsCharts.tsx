"use client";

import { useId, useState, type CSSProperties } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Appear } from "@/components/ui/appear";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useEntranceMotion } from "@/hooks/use-entrance-motion";
import type { StudioAnalytics } from "@/lib/studio-analytics";

export function AnalyticsTrend({ data }: { data: StudioAnalytics }) {
  const { t, locale } = useDashboardI18n();
  const { ref, ready, animate } = useEntranceMotion<HTMLDivElement>();
  const [metric, setMetric] = useState<
    "appointmentValueMinorUnits" | "completedVisits"
  >("appointmentValueMinorUnits");
  const [animateMetricChange, setAnimateMetricChange] = useState(true);
  const gradient = useId().replace(/:/g, "");
  const value = metric === "appointmentValueMinorUnits";
  const label = value
    ? t("Appointment value", "Вредност на термините", "Vlera e termineve")
    : t("Completed visits", "Завршени посети", "Vizita të përfunduara");
  const compact = (number: number) =>
    new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value ? number / 100 : number);
  const pointLabel = (timestamp: number) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      ...(data.trendGranularity === "day"
        ? ({ day: "numeric", month: "short" } as const)
        : ({ month: "short", year: "numeric" } as const)),
    }).format(timestamp);
  return (
    <Appear className="min-w-0">
      <Card
        ref={ref}
        className="h-full min-w-0 gap-5 rounded-3xl border-0 py-6 shadow-none"
      >
        <CardHeader className="flex flex-wrap items-start justify-between gap-4 px-5 sm:px-6">
          <div className="flex flex-col gap-1.5">
            <CardTitle>
              {t(
                "Your studio, over time",
                "Вашето студио низ времето",
                "Studioja juaj me kalimin e kohës",
              )}
            </CardTitle>
            <CardDescription>
              {value
                ? t(
                    `Completed appointment value · ${data.currency}`,
                    `Вредност на завршени термини · ${data.currency}`,
                    `Vlera e termineve të përfunduara · ${data.currency}`,
                  )
                : t(
                    "Every completed appointment in the selected period",
                    "Секој завршен термин во избраниот период",
                    "Çdo termin i përfunduar në periudhën e zgjedhur",
                  )}
            </CardDescription>
          </div>
          <div className="flex rounded-lg bg-secondary p-1">
            <Button
              size="sm"
              variant="ghost"
              className={
                value
                  ? "h-7 bg-card text-xs shadow-xs"
                  : "h-7 text-xs text-muted-foreground"
              }
              onClick={(event) => {
                setAnimateMetricChange(event.detail > 0);
                setMetric("appointmentValueMinorUnits");
              }}
              aria-pressed={value}
            >
              {t("Value", "Вредност", "Vlera")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className={
                !value
                  ? "h-7 bg-card text-xs shadow-xs"
                  : "h-7 text-xs text-muted-foreground"
              }
              onClick={(event) => {
                setAnimateMetricChange(event.detail > 0);
                setMetric("completedVisits");
              }}
              aria-pressed={!value}
            >
              {t("Visits", "Посети", "Vizita")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 px-2 sm:px-5">
          <ChartContainer
            config={{ [metric]: { label, color: "var(--chart-1)" } }}
            className="h-[260px] w-full aspect-auto"
          >
            <AreaChart
              accessibilityLayer
              data={data.trend}
              margin={{ top: 12, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.24}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--chart-1)"
                    stopOpacity={0.01}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 6" />
              <XAxis
                dataKey="startAt"
                tickFormatter={pointLabel}
                axisLine={false}
                tickLine={false}
                minTickGap={36}
                tickMargin={14}
              />
              <YAxis
                tickFormatter={compact}
                axisLine={false}
                tickLine={false}
                width={52}
                tickMargin={8}
                allowDecimals={false}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      pointLabel(
                        payload[0]?.payload.startAt ?? data.period.startMs,
                      )
                    }
                    formatter={(amount) => (
                      <span className="font-medium tabular-nums">
                        {new Intl.NumberFormat(locale, {
                          maximumFractionDigits: value ? 2 : 0,
                        }).format(
                          value ? Number(amount) / 100 : Number(amount),
                        )}
                        {value
                          ? ` ${data.currency}`
                          : ` ${t("visits", "посети", "vizita")}`}
                      </span>
                    )}
                  />
                }
              />
              {ready && (
                <Area
                  key={`${metric}-${animate}`}
                  type="monotone"
                  dataKey={metric}
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill={`url(#${gradient})`}
                  isAnimationActive={animate && animateMetricChange}
                  animationDuration={850}
                  animationEasing="ease-out"
                  animationBegin={80}
                  activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 3 }}
                  dot={data.trend.length < 4 ? { r: 4 } : false}
                />
              )}
            </AreaChart>
          </ChartContainer>
          {data.summary.completedVisits === 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {t(
                "Completed appointments will bring this chart to life.",
                "Завршените термини ќе се прикажат на овој графикон.",
                "Terminet e përfunduara do ta mbushin këtë grafik.",
              )}
            </p>
          )}
          <details className="mx-3 mt-4 text-xs text-muted-foreground">
            <summary className="w-fit cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ring">
              {t(
                "View chart data",
                "Прикажи податоци",
                "Shiko të dhënat e grafikut",
              )}
            </summary>
            <div className="mt-3 max-h-48 overflow-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="py-2">
                      {t("Period", "Период", "Periudha")}
                    </th>
                    <th className="py-2 text-right">
                      {label}
                      {value && ` (${data.currency})`}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend.map((point) => (
                    <tr key={point.key} className="border-t">
                      <td className="py-2">{pointLabel(point.startAt)}</td>
                      <td className="text-right tabular-nums">
                        {new Intl.NumberFormat(locale).format(
                          value ? point[metric] / 100 : point[metric],
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </CardContent>
      </Card>
    </Appear>
  );
}

export function AnalyticsClientMix({ data }: { data: StudioAnalytics }) {
  const { t, locale } = useDashboardI18n();
  const { ref, ready, animate } = useEntranceMotion<HTMLDivElement>();
  const slices = [
    {
      name: t("Returning", "Повторни", "Të rikthyer"),
      value: data.summary.returningClients,
      color: "var(--chart-1)",
    },
    {
      name: t("First-time", "Првпат", "Për herë të parë"),
      value: data.summary.newClients,
      color: "var(--chart-3)",
    },
  ];
  const statusLabels = {
    completed: t("Completed", "Завршени", "Të përfunduara"),
    confirmed: t("Confirmed", "Потврдени", "Të konfirmuara"),
    checked_in: t("Arrived", "Пристигнати", "Të ardhur"),
    cancelled: t("Cancelled", "Откажани", "Të anuluara"),
    no_show: t("No-shows", "Недојдени", "Mosparaqitje"),
  };
  return (
    <Appear delay={60} className="min-w-0">
      <Card
        ref={ref}
        className="h-full min-w-0 gap-3 rounded-3xl border-0 py-6 shadow-none"
      >
        <CardHeader className="gap-1.5 px-5 sm:px-6">
          <CardTitle>
            {t(
              "Familiar faces. New beginnings.",
              "Познати лица. Нови почетоци.",
              "Fytyra të njohura. Fillime të reja.",
            )}
          </CardTitle>
          <CardDescription>
            {t(
              "The clients behind your appointments",
              "Клиентите зад вашите термини",
              "Klientët pas termineve tuaja",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 sm:px-6">
          <div className="relative mx-auto h-44 max-w-64">
            <ChartContainer
              config={{ value: { label: t("Clients", "Клиенти", "Klientë") } }}
              className="h-full w-full aspect-auto"
            >
              <PieChart>
                {ready && (
                  <Pie
                    key={String(animate)}
                    data={
                      data.summary.visitedClients
                        ? slices
                        : [{ name: "", value: 1, color: "var(--secondary)" }]
                    }
                    dataKey="value"
                    nameKey="name"
                    innerRadius={61}
                    outerRadius={78}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={
                      data.summary.newClients && data.summary.returningClients
                        ? 4
                        : 0
                    }
                    strokeWidth={0}
                    isAnimationActive={
                      animate && data.summary.visitedClients > 0
                    }
                    animationDuration={850}
                    animationEasing="ease-out"
                    animationBegin={100}
                  >
                    {(data.summary.visitedClients
                      ? slices
                      : [{ color: "var(--secondary)" }]
                    ).map((slice, index) => (
                      <Cell key={index} fill={slice.color} />
                    ))}
                  </Pie>
                )}
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-3xl font-medium tracking-tight tabular-nums">
                {data.summary.visitedClients ? (
                  <AnimatedNumber
                    value={Math.round(data.summary.returningClientPercent)}
                    locale={locale}
                    suffix="%"
                    delay={100}
                  />
                ) : (
                  "—"
                )}
              </strong>
              <span className="mt-1 text-xs text-muted-foreground">
                {t("returning", "повторни", "të rikthyer")}
              </span>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs">
            {slices.map((slice) => (
              <span
                data-appear
                key={slice.name}
                className="flex items-center gap-2"
              >
                <i
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: slice.color }}
                />
                <span className="text-muted-foreground">{slice.name}</span>
                <strong className="font-medium tabular-nums">
                  <AnimatedNumber
                    value={slice.value}
                    locale={locale}
                    delay={100}
                  />
                </strong>
              </span>
            ))}
          </div>
          <div className="mt-5 border-t pt-4">
            <p className="mb-3 text-xs font-medium">
              {t(
                "Appointment breakdown",
                "Преглед на термините",
                "Përmbledhja e termineve",
              )}
            </p>
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
              {data.statuses
                .filter(
                  (status) =>
                    status.status !== "checked_in" || status.count > 0,
                )
                .map((status) => (
                  <span
                    data-appear
                    key={status.status}
                    className="flex justify-between gap-3"
                  >
                    <span className="text-muted-foreground">
                      {statusLabels[status.status]}
                    </span>
                    <span className="tabular-nums">
                      <AnimatedNumber
                        value={status.count}
                        locale={locale}
                        delay={120}
                      />
                    </span>
                  </span>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </Appear>
  );
}

export function AnalyticsServices({ data }: { data: StudioAnalytics }) {
  const { t, locale } = useDashboardI18n();
  const maximum = Math.max(
    1,
    ...data.topServices.map((service) => service.completedVisits),
  );
  return (
    <Appear className="min-w-0">
      <Card className="h-full min-w-0 gap-5 rounded-3xl border-0 py-6 shadow-none">
        <CardHeader className="gap-1.5 px-5 sm:px-6">
          <CardTitle>
            {t(
              "What brings clients in",
              "Што ги привлекува клиентите",
              "Çfarë i sjell klientët",
            )}
          </CardTitle>
          <CardDescription>
            {t(
              "Your most-booked services in completed visits",
              "Најзакажуваните услуги во завршени посети",
              "Shërbimet më të rezervuara në vizitat e përfunduara",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 sm:px-6">
          {data.topServices.length ? (
            <div className="flex flex-col gap-6">
              {data.topServices.slice(0, 5).map((service, index) => (
                <div
                  data-appear
                  key={service.id}
                  className="flex flex-col gap-2.5"
                  style={{ "--appear-step": index + 1 } as CSSProperties}
                >
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{service.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      <strong className="mr-1 font-medium text-foreground tabular-nums">
                        <AnimatedNumber
                          value={service.completedVisits}
                          locale={locale}
                          delay={index * 45}
                        />
                      </strong>
                      {t("visits", "посети", "vizita")}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      key={`${service.completedVisits}-${maximum}`}
                      data-appear="bar-x"
                      className="h-full rounded-full"
                      style={{
                        animationDuration: "650ms",
                        width: `${(service.completedVisits / maximum) * 100}%`,
                        background: `var(--chart-${Math.min(index + 1, 3)})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {t(
                "Your most popular services will appear after completed visits.",
                "Најпопуларните услуги ќе се прикажат по завршени посети.",
                "Shërbimet më të njohura do të shfaqen pas vizitave të përfunduara.",
              )}
            </p>
          )}
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            {t(
              "Top 5 services. A visit with multiple services counts once for each service.",
              "Топ 5 услуги. Посета со повеќе услуги се брои еднаш за секоја услуга.",
              "5 shërbimet kryesore. Një vizitë me disa shërbime numërohet një herë për secilin.",
            )}
          </p>
        </CardContent>
      </Card>
    </Appear>
  );
}
