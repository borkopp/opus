"use client";

import { AlarmClock, Clock3, Hourglass, SprayCan } from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Badge } from "@/components/ui/badge";
import type { StaffReservation } from "./ReservationEditDialog";

export function ReservationAttentionIndicators({
  attention,
}: {
  attention: StaffReservation["attention"];
}) {
  const { t } = useDashboardI18n();
  const timing = attention.timing;
  const cleaningCount = attention.cleaning.length;
  return (
    <>
      {timing && (
        <Badge
          variant={
            timing.kind === "overdue"
              ? "danger"
              : timing.kind === "late_arrival"
                ? "highlight"
                : "brand-soft"
          }
          className="max-w-full whitespace-normal text-left tabular-nums [&>svg]:shrink-0"
        >
          {timing.kind === "late_arrival" ? (
            <AlarmClock aria-hidden="true" />
          ) : timing.kind === "overdue" ? (
            <Hourglass aria-hidden="true" />
          ) : (
            <Clock3 aria-hidden="true" />
          )}
          {timing.kind === "late_arrival"
            ? t(
                "Late arrival",
                "Задоцнето пристигнување",
                "Mbërritje me vonesë",
              )
            : timing.kind === "overdue"
              ? t("Overdue", "Надминато време", "Koha e tejkaluar")
              : t(
                  "Ending soon",
                  "Завршува наскоро",
                  "Përfundon së shpejti",
                )}{" "}
          · {timing.minutes} {t("min", "мин", "min")}
        </Badge>
      )}
      {cleaningCount > 0 && (
        <Badge
          variant="highlight"
          className="max-w-full whitespace-normal text-left tabular-nums [&>svg]:shrink-0"
        >
          <SprayCan aria-hidden="true" />
          {t(
            `Cleaning needed · ${cleaningCount} ${cleaningCount === 1 ? "table" : "tables"}`,
            `Потребно е чистење · ${cleaningCount} ${cleaningCount === 1 ? "маса" : "маси"}`,
            `Nevojitet pastrim · ${cleaningCount} ${cleaningCount === 1 ? "tavolinë" : "tavolina"}`,
          )}
        </Badge>
      )}
    </>
  );
}
