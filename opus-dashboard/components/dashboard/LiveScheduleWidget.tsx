import { Fragment } from "react";
import { format } from "date-fns";
import { enUS, mk } from "date-fns/locale";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import type { FunctionReturnType } from "convex/server";

import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { WidgetTitle } from "@/components/dashboard/WidgetTitle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type DailyBooking = FunctionReturnType<
  typeof api.dashboard.getDailySchedule
>[number];

export function LiveScheduleWidget({
  groupedByStaff,
  onComplete,
}: {
  groupedByStaff: Record<string, DailyBooking[]>;
  onComplete: (bookingId: Id<"bookings">) => Promise<void>;
}) {
  const { language, t } = useDashboardI18n();
  const dateLocale = language === "mk" ? mk : enUS;

  const allBookings = Object.values(groupedByStaff)
    .flat()
    .sort((a, b) => a.startAt - b.startAt);

  return (
    <Card className="min-h-0 gap-0 overflow-hidden md:h-full">
      <CardHeader className="shrink-0 pb-4">
        <CardTitle>
          <WidgetTitle>{t("Live Schedule", "Дневен распоред")}</WidgetTitle>
        </CardTitle>
        <CardDescription className="capitalize">
          {format(new Date(), "EEEE, d MMMM", { locale: dateLocale })}
        </CardDescription>
        <CardAction>
          <span className="text-sm text-muted-foreground">
            {allBookings.length === 1
              ? t("1 appointment", "1 термин")
              : t(
                  `${allBookings.length} appointments`,
                  `${allBookings.length} термини`,
                )}
          </span>
        </CardAction>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 pb-5">
        {allBookings.length === 0 ? (
          <Empty className="h-full min-h-48 bg-muted/30">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>
                {t("Nothing booked today", "Нема закажани термини денес")}
              </EmptyTitle>
              <EmptyDescription>
                {t(
                  "New appointments will appear here in time order.",
                  "Новите термини ќе се појават овде по хронолошки редослед.",
                )}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="h-full overflow-y-auto pr-1">
            <ol aria-label={t("Today's appointments", "Денешни термини")}>
              {allBookings.map((booking, index) => (
                <Fragment key={booking._id}>
                  <ScheduleRow booking={booking} onComplete={onComplete} />
                  {index < allBookings.length - 1 && <Separator />}
                </Fragment>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScheduleRow({
  booking,
  onComplete,
}: {
  booking: DailyBooking;
  onComplete: (bookingId: Id<"bookings">) => Promise<void>;
}) {
  const isTerminal = ["completed", "cancelled", "no_show"].includes(
    booking.status,
  );

  return (
    <li
      className={cn(
        "grid grid-cols-[3.75rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:gap-x-4",
        isTerminal && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3 self-stretch">
        <span
          aria-hidden="true"
          className={cn(
            "h-8 w-0.5 shrink-0 rounded-full bg-border",
            booking.status === "completed" && "bg-success",
            ["cancelled", "no_show"].includes(booking.status) && "bg-danger/50",
          )}
        />
        <time
          className="font-mono text-sm font-medium tabular-nums text-foreground"
          dateTime={new Date(booking.startAt).toISOString()}
        >
          {format(new Date(booking.startAt), "HH:mm")}
        </time>
      </div>

      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">
          {booking.customerName}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {booking.serviceName} · {booking.staffName}
        </p>
      </div>

      <div className="col-start-2 row-start-2 justify-self-start sm:col-start-3 sm:row-start-1 sm:justify-self-end">
        <BookingAction booking={booking} onComplete={onComplete} />
      </div>
    </li>
  );
}

function BookingAction({
  booking,
  onComplete,
}: {
  booking: DailyBooking;
  onComplete: (bookingId: Id<"bookings">) => Promise<void>;
}) {
  const { t } = useDashboardI18n();

  switch (booking.status) {
    case "confirmed":
    case "checked_in":
      return (
        <Button size="sm" onClick={() => void onComplete(booking._id)}>
          {t("Complete", "Заврши")}
        </Button>
      );
    case "completed":
      return (
        <Badge variant="success">
          <CheckCircle2 data-icon="inline-start" />
          {t("Completed", "Завршено")}
        </Badge>
      );
    case "cancelled":
      return <Badge variant="outline">{t("Cancelled", "Откажано")}</Badge>;
    case "no_show":
      return <Badge variant="danger">{t("No show", "Не се појави")}</Badge>;
  }
}
