"use client";

import {
  CalendarClock,
  Clock3,
  MoreHorizontal,
  Table2,
  Users,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { localTimeLabel } from "@/convex/lib/reservationTime";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  ReservationEditMode,
  StaffReservation,
} from "./ReservationEditDialog";
import { ReservationAttentionIndicators } from "./ReservationAttentionIndicators";

export type ReservationQuickAction =
  | "arrive"
  | "seat"
  | "complete"
  | "no_show"
  | "ready";

export function ReservationListCard({
  reservation,
  date,
  timezone,
  owner,
  busy,
  readOnly = false,
  compact = false,
  readyDisabled = false,
  showAttention = false,
  onChange,
  onEdit,
  onErase,
}: {
  reservation: StaffReservation;
  date: string;
  timezone: string;
  owner: boolean;
  busy: boolean;
  readOnly?: boolean;
  compact?: boolean;
  readyDisabled?: boolean;
  showAttention?: boolean;
  onChange: (action: ReservationQuickAction, tableIds?: Id<"tables">[]) => void;
  onEdit: (mode: ReservationEditMode) => void;
  onErase: () => void;
}) {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const confirmed = reservation.status === "confirmed";
  const seated = reservation.status === "seated";
  const editable = !readOnly && (confirmed || seated);
  const canErase = !readOnly && owner && !reservation.guestErased;
  const hasMenu = editable || canErase;
  return (
    <Card
      id={`reservation-${reservation._id}`}
      tabIndex={-1}
      className="min-w-0 scroll-mt-24 gap-3 rounded-3xl border-0 shadow-none"
      data-testid="reservation-row"
    >
      <CardHeader className="grid-cols-[minmax(0,1fr)_auto] gap-x-3">
        <div
          className={cn(
            "flex min-w-0 flex-col gap-3",
            !compact && "sm:flex-row sm:gap-5",
          )}
        >
          <div
            className={cn(
              "flex shrink-0 items-baseline gap-2 tabular-nums",
              !compact && "sm:w-20 sm:flex-col sm:gap-1",
            )}
          >
            <span className="text-xl font-medium tracking-tight">
              {localTimeLabel(reservation.startAt, timezone)}
            </span>
            <span className="text-sm text-muted-foreground">
              – {localTimeLabel(reservation.endAt, timezone)}
            </span>
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <CardTitle>
              <h2 className="break-words leading-snug">
                {reservation.customerName}
              </h2>
            </CardTitle>
            <CardDescription className="flex flex-wrap gap-x-4 gap-y-2">
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4" aria-hidden="true" />
                {t(
                  `${reservation.partySize} guests`,
                  `${reservation.partySize} гости`,
                  `${reservation.partySize} mysafirë`,
                )}
              </span>
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <Table2 className="size-4 shrink-0" aria-hidden="true" />
                <span className="break-words">
                  {reservation.tableLabels?.join(" + ")}
                </span>
              </span>
            </CardDescription>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  seated ? "success" : confirmed ? "brand-soft" : "secondary"
                }
              >
                {copy(reservation.status)}
                {reservation.arrivedAt !== undefined && confirmed
                  ? ` ${copy("· arrived")}`
                  : ""}
              </Badge>
              {reservation.serviceDate !== date && (
                <Badge variant="outline">
                  <CalendarClock aria-hidden="true" />
                  {reservation.serviceDate} {copy("· carried over")}
                </Badge>
              )}
              {showAttention && (
                <ReservationAttentionIndicators
                  attention={reservation.attention}
                />
              )}
            </div>
          </div>
        </div>
        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                disabled={busy}
                aria-label={t(
                  `Reservation actions for ${reservation.customerName}`,
                  `Дејства за резервацијата на ${reservation.customerName}`,
                  `Veprime për rezervimin e ${reservation.customerName}`,
                )}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {editable && (
                <DropdownMenuGroup>
                  {!reservation.guestErased &&
                    reservation.schemaVersion === 2 &&
                    reservation.timeModel === "utc" && (
                      <DropdownMenuItem onSelect={() => onEdit("details")}>
                        {t(
                          "Edit guest & party",
                          "Уреди гостин и група",
                          "Redakto mysafirin dhe grupin",
                        )}
                      </DropdownMenuItem>
                    )}
                  {confirmed && (
                    <DropdownMenuItem onSelect={() => onEdit("reschedule")}>
                      {copy("Reschedule")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onSelect={() => onEdit("move")}>
                    {copy("Move table")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit("duration")}>
                    {copy("Change duration")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              )}
              {confirmed && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => onChange("no_show")}>
                      {copy("No-show")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => onEdit("cancel")}
                    >
                      {copy("Cancel")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
              {canErase && (
                <>
                  {editable && <DropdownMenuSeparator />}
                  <DropdownMenuGroup>
                    <DropdownMenuItem variant="destructive" onSelect={onErase}>
                      {copy("Anonymize guest")}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        <div
          className={cn(
            "flex min-w-0 flex-col gap-3",
            !compact && "sm:flex-row sm:items-end sm:justify-between",
          )}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <p className="break-all text-sm text-muted-foreground">
              {reservation.customerPhone ??
                reservation.customerEmail ??
                copy("No contact details")}
            </p>
            {reservation.specialRequests && (
              <p className="max-w-2xl whitespace-pre-wrap break-words text-sm">
                {reservation.specialRequests}
              </p>
            )}
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              {confirmed && (
                <>
                  {reservation.arrivedAt === undefined && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => onChange("arrive")}
                    >
                      {copy("Arrived")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={
                      reservation.arrivedAt !== undefined
                        ? "default"
                        : "outline"
                    }
                    disabled={busy}
                    onClick={() => onChange("seat")}
                  >
                    {copy("Seat guests")}
                  </Button>
                </>
              )}
              {seated && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => onChange("complete")}
                >
                  {copy("Finish visit")}
                </Button>
              )}
            </div>
          )}
        </div>
        {Boolean(reservation.cleaningTables?.length) && (
          <div className="flex flex-col gap-3 border-t pt-4">
            {reservation.cleaningTables?.map((table) => {
              const cleaning = showAttention
                ? reservation.attention.cleaning.find(
                    (item) => item.tableId === table.tableId,
                  )
                : undefined;
              return (
                <div
                  key={table.tableId}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <span className="inline-flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="size-4 shrink-0" aria-hidden="true" />
                    <span className="break-words">
                      {table.label}{" "}
                      {cleaning ? (
                        cleaning.canRelease ? (
                          t(
                            "· Ready for reset",
                            "· Подготвена за ресетирање",
                            "· Gati për rivendosje",
                          )
                        ) : (
                          t(
                            `· Cleaning buffer · ${cleaning.minutesUntilReady} min`,
                            `· Време за чистење · ${cleaning.minutesUntilReady} мин`,
                            `· Kohë pastrimi · ${cleaning.minutesUntilReady} min`,
                          )
                        )
                      ) : (
                        <>
                          {copy("· reset buffer ends")}{" "}
                          {localTimeLabel(table.readyAt, timezone)}
                        </>
                      )}
                    </span>
                  </span>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-auto min-h-9 whitespace-normal text-left"
                      disabled={
                        busy ||
                        readyDisabled ||
                        (showAttention && !cleaning?.canRelease)
                      }
                      onClick={() => onChange("ready", [table.tableId])}
                    >
                      {copy("Mark")} {table.label} {copy("ready")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
