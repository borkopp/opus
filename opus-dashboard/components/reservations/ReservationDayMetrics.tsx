"use client";

import { CalendarDays, Users, CalendarX2, UserRoundX } from "lucide-react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

export function ReservationDayMetrics({
  summary,
}: {
  summary: FunctionReturnType<typeof api.reservations.getDaySummary>;
}) {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const items = [
    { label: "Reservations", value: summary.reservations, icon: CalendarDays },
    { label: "Covers", value: summary.covers, icon: Users },
    { label: "Cancellations", value: summary.cancellations, icon: CalendarX2 },
    { label: "No-shows", value: summary.noShows, icon: UserRoundX },
  ];
  return (
    <section
      aria-label={t(
        "Day at a glance",
        "Денот на прв поглед",
        "Dita me një vështrim",
      )}
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(({ label, value, icon: Icon }) => (
          <Card
            key={label}
            className="min-w-0 gap-2 rounded-3xl border-0 shadow-none"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-2 px-4 pt-4 sm:px-5 sm:pt-5">
              <CardDescription>
                <span>{copy(label)}</span>
              </CardDescription>
              <Icon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </CardHeader>
            <CardContent className="px-4 sm:px-5">
              <p className="text-3xl font-medium tracking-tight tabular-nums">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {copy(
          "Expected and served reservations for the selected service date. Carryover visits are shown below separately.",
        )}
      </p>
    </section>
  );
}
