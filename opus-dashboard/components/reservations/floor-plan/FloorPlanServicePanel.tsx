"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowUpRight, UserPlus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { reservationDateTime } from "@/lib/reservation-format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationError } from "../ReservationFields";
import {
  ReservationListCard,
  type ReservationQuickAction,
} from "../ReservationListCard";
import {
  ReservationEditDialog,
  type ReservationEditMode,
  type StaffReservation,
} from "../ReservationEditDialog";
import { ReservationGuestEraseDialog } from "../ReservationGuestEraseDialog";

type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;
type LiveTable = FunctionReturnType<
  typeof api.hospitality.getLiveTables
>["tables"][number];
type Visit = NonNullable<LiveTable["current"]>;
type VisitContext = {
  visit: Visit;
  current: boolean;
  next: boolean;
  cleaning?: LiveTable["cleaning"][number];
};

export function FloorPlanServicePanel({
  workspace,
  table,
  live,
  timezone,
  refreshed,
  onWalkIn,
}: {
  workspace: Workspace;
  table: Workspace["tables"][number];
  live: LiveTable | undefined;
  timezone: string;
  refreshed: boolean;
  onWalkIn: () => void;
}) {
  const { t, locale } = useDashboardI18n();
  const copy = useReservationCopy();
  const action = useReservationAction();
  const change = useMutation(api.reservations.change);
  const [editing, setEditing] = useState<{
    reservation: StaffReservation;
    mode: ReservationEditMode;
  } | null>(null);
  const [erasing, setErasing] = useState<StaffReservation | null>(null);
  const blocked =
    !workspace.canReadReservations || !live || live.status === "needs_review";
  const busy = action.busy || !refreshed;
  const canWalkIn =
    !blocked &&
    !busy &&
    !editing &&
    !erasing &&
    (live?.status === "available" || live?.status === "reserved") &&
    !live.inactive &&
    !live.current &&
    !live.cleaning.length &&
    !live.closure;
  const visits = new Map<Id<"reservations">, VisitContext>();
  if (live?.current)
    visits.set(live.current.reservationId, {
      visit: live.current,
      current: true,
      next: false,
    });
  for (const cleaning of live?.cleaning ?? []) {
    const existing = visits.get(cleaning.reservationId);
    visits.set(cleaning.reservationId, {
      visit: cleaning,
      current: existing?.current ?? false,
      next: false,
      cleaning,
    });
  }
  if (live?.next) {
    const existing = visits.get(live.next.reservationId);
    visits.set(live.next.reservationId, {
      ...existing,
      visit: live.next,
      current: existing?.current ?? false,
      next: true,
    });
  }
  function changeVisit(
    reservation: StaffReservation,
    next: ReservationQuickAction,
    canRelease: boolean,
  ) {
    if (blocked || busy || (next === "ready" && !canRelease)) return;
    const messages = {
      arrive: "Arrival recorded",
      seat: "Guests seated",
      complete: "Visit finished; tables need resetting",
      no_show: "No-show recorded",
      ready: "Table ready",
    };
    void action.run(
      () =>
        change({
          reservationId: reservation._id,
          expectedRevision: reservation.revision ?? 0,
          action: next,
          ...(next === "ready" ? { tableIds: [table._id] } : {}),
        }),
      copy(messages[next]),
    );
  }
  const status = live?.status;
  const label =
    status === "needs_review"
      ? t("Needs review", "Потребна е проверка", "Kërkon rishikim")
      : status === "closed"
        ? t("Closed", "Затворена", "E mbyllur")
        : status === "reserved"
          ? t("Reserved", "Резервирана", "E rezervuar")
          : status
            ? copy(status)
            : t("Loading", "Се вчитува", "Duke ngarkuar");
  return (
    <section
      className="flex min-w-0 flex-col gap-3"
      aria-label={t(
        `Service at ${table.label}`,
        `Посети на ${table.label}`,
        `Shërbimi në ${table.label}`,
      )}
      data-testid="floor-plan-service-panel"
    >
      <Card className="min-w-0">
        <CardHeader>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <CardTitle className="[overflow-wrap:anywhere]">
              {table.label}
            </CardTitle>
            <Badge
              variant={
                status === "needs_review"
                  ? "danger"
                  : status === "occupied"
                    ? "success"
                    : "secondary"
              }
            >
              {label}
            </Badge>
            {live?.inactive && status !== "inactive" && (
              <Badge variant="outline">{copy("Inactive")}</Badge>
            )}
          </div>
          <CardDescription>
            {table.minCapacity ?? 1}–{table.capacity} {copy("guests")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-3">
          <Button
            disabled={!canWalkIn}
            className="h-auto min-h-9 whitespace-normal"
            onClick={onWalkIn}
          >
            <UserPlus data-icon="inline-start" />
            {t(
              "Seat a walk-in",
              "Смести гостин без резервација",
              "Ul një mysafir pa rezervim",
            )}
          </Button>
          <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {t(
              `Uses ${table.label}, or an available configured combination containing it.`,
              `Ја користи ${table.label} или достапна поставена комбинација што ја вклучува.`,
              `Përdor ${table.label}, ose një kombinim të konfiguruar të disponueshëm që e përfshin.`,
            )}
          </p>
          {live && blocked && (
            <Alert>
              <AlertDescription>
                {live.status === "needs_review"
                  ? t(
                      "Review this table’s unresolved reservations before changing its state.",
                      "Проверете ги неразјаснетите резервации на масата пред промена на состојбата.",
                      "Rishikoni rezervimet e pazgjidhura të kësaj tavoline para se të ndryshoni gjendjen.",
                    )
                  : t(
                      "Visit actions are unavailable until reservation settings are ready.",
                      "Дејствата за посетите не се достапни додека поставките за резервации не се подготвени.",
                      "Veprimet e vizitave nuk janë të disponueshme derisa cilësimet e rezervimeve të jenë gati.",
                    )}
              </AlertDescription>
            </Alert>
          )}
          {live?.closure && (
            <Alert>
              <AlertDescription className="[overflow-wrap:anywhere]">
                {t("Closure", "Затворање", "Mbyllje")}: {live.closure.reason}
                <br />
                {reservationDateTime(
                  live.closure.startAt,
                  timezone,
                  locale,
                )} – {reservationDateTime(live.closure.endAt, timezone, locale)}
              </AlertDescription>
            </Alert>
          )}
          {!live ? (
            <Skeleton className="h-20" />
          ) : (
            visits.size === 0 && (
              <p className="text-sm text-muted-foreground">
                {status === "available"
                  ? t(
                      "No current or upcoming visit.",
                      "Нема тековна или претстојна посета.",
                      "Nuk ka vizita aktuale ose të ardhshme.",
                    )
                  : t(
                      "Unavailable for new reservations.",
                      "Не е достапна за нови резервации.",
                      "Nuk është e disponueshme për rezervime të reja.",
                    )}
              </p>
            )
          )}
          <ReservationError error={action.error} />
        </CardContent>
      </Card>
      {[...visits.values()].map((context) => (
        <ServiceVisit
          key={context.visit.reservationId}
          context={context}
          tableId={table._id}
          timezone={timezone}
          blocked={blocked}
          busy={busy}
          owner={workspace.role === "owner"}
          overdue={Boolean(context.current && live?.overdue)}
          late={Boolean(context.next && live?.late)}
          onChange={changeVisit}
          onEdit={(reservation, mode) => setEditing({ reservation, mode })}
          onErase={setErasing}
        />
      ))}
      {editing && !blocked && (
        <ReservationEditDialog
          reservation={editing.reservation}
          mode={editing.mode}
          onClose={() => setEditing(null)}
          onDateChange={() => {}}
        />
      )}
      {erasing && workspace.role === "owner" && !blocked && (
        <ReservationGuestEraseDialog
          reservation={erasing}
          onClose={() => setErasing(null)}
        />
      )}
    </section>
  );
}

function ServiceVisit({
  context,
  tableId,
  timezone,
  blocked,
  busy,
  owner,
  overdue,
  late,
  onChange,
  onEdit,
  onErase,
}: {
  context: VisitContext;
  tableId: Id<"tables">;
  timezone: string;
  blocked: boolean;
  busy: boolean;
  owner: boolean;
  overdue: boolean;
  late: boolean;
  onChange: (
    reservation: StaffReservation,
    next: ReservationQuickAction,
    canRelease: boolean,
  ) => void;
  onEdit: (reservation: StaffReservation, mode: ReservationEditMode) => void;
  onErase: (reservation: StaffReservation) => void;
}) {
  const { t, locale } = useDashboardI18n();
  const reservation = useQuery(api.reservations.get, {
    reservationId: context.visit.reservationId,
  });
  const readOnly =
    blocked ||
    Boolean(
      reservation &&
      (reservation.schemaVersion !== 2 || reservation.timeModel !== "utc"),
    );
  const stale = reservation?.revision !== context.visit.revision;
  const canRelease = Boolean(context.cleaning?.canRelease);
  const title = context.current
    ? t("Current visit", "Тековна посета", "Vizita aktuale")
    : context.cleaning
      ? t("Table reset", "Подготовка на маса", "Përgatitja e tavolinës")
      : t("Next reservation", "Следна резервација", "Rezervimi i radhës");
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <h3 className="text-sm font-medium">{title}</h3>
        {overdue && (
          <Badge variant="danger">
            {t("Overdue", "Надминато време", "Koha e tejkaluar")}
          </Badge>
        )}
        {late && (
          <Badge variant="highlight">
            {t("Late arrival", "Доцни", "Mbërritje me vonesë")}
          </Badge>
        )}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {reservationDateTime(context.visit.startAt, timezone, locale)}
      </p>
      {reservation ? (
        <>
          <ReservationListCard
            reservation={{
              ...reservation,
              cleaningTableIds: reservation.cleaningTableIds.filter(
                (id) => id === tableId,
              ),
              cleaningTables: reservation.cleaningTables.filter(
                (row) => row.tableId === tableId,
              ),
            }}
            date={context.visit.serviceDate}
            timezone={timezone}
            owner={owner}
            busy={busy || stale}
            readOnly={readOnly}
            compact
            readyDisabled={!canRelease}
            onChange={(next) => {
              if (!readOnly && !stale) onChange(reservation, next, canRelease);
            }}
            onEdit={(mode) => {
              if (!readOnly && !busy && !stale) onEdit(reservation, mode);
            }}
            onErase={() => {
              if (owner && !readOnly && !busy && !stale) onErase(reservation);
            }}
          />
          {reservation.status === "seated" && !readOnly && (
            <p className="px-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
              {t(
                `Finishing ends this party’s visit on all its tables (${reservation.tableLabels?.join(" + ")}). Reset marks only the selected table ready.`,
                `Завршувањето ја завршува посетата на групата на сите нејзини маси (${reservation.tableLabels?.join(" + ")}). Подготовката ја означува само избраната маса како подготвена.`,
                `Përfundimi mbyll vizitën e grupit në të gjitha tavolinat e tij (${reservation.tableLabels?.join(" + ")}). Përgatitja shënon gati vetëm tavolinën e zgjedhur.`,
              )}
            </p>
          )}
        </>
      ) : (
        <Skeleton className="h-52" />
      )}
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link
          href={`/hospitality?date=${context.visit.serviceDate}#reservation-${context.visit.reservationId}`}
        >
          {t("View reservation", "Прикажи резервација", "Shiko rezervimin")}
          <ArrowUpRight data-icon="inline-end" />
        </Link>
      </Button>
    </div>
  );
}
