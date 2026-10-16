"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { localDate, validServiceDate } from "@/convex/lib/reservationTime";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { ArrowUpRight, Plus, Table2 } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { ReservationDayMetrics } from "./ReservationDayMetrics";
import { ReservationListFilters } from "./ReservationListFilters";
import {
  countReservationStatuses,
  filterReservations,
  type ReservationStatusFilter,
} from "@/lib/reservation-list";
import {
  ReservationListCard,
  type ReservationQuickAction,
} from "./ReservationListCard";
import type { Id } from "@/convex/_generated/dataModel";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { useLiveReservations } from "@/hooks/use-live-reservations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReservationError, ReservationInput } from "./ReservationFields";
import { ReservationCreateDialog } from "./ReservationCreateDialog";
import { VenueSetupGuide } from "./VenueSetupGuide";
import { ReservationGuestEraseDialog } from "./ReservationGuestEraseDialog";
import {
  ReservationEditDialog,
  type ReservationEditMode,
  type StaffReservation,
} from "./ReservationEditDialog";

type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;
export function ReservationWorkspace({
  initialDate,
}: {
  initialDate?: string;
}) {
  const access = useQuery(api.hospitality.getAccess);
  const workspace = useQuery(
    api.hospitality.getWorkspace,
    access?.hasVenue ? {} : "skip",
  );
  if (!access || (access.hasVenue && !workspace))
    return <Skeleton className="h-96" />;
  if (!workspace) return null;
  return (
    <DayWorkspace
      key={workspace.org._id}
      workspace={workspace}
      initialDate={initialDate}
    />
  );
}

function DayWorkspace({
  workspace,
  initialDate,
}: {
  workspace: Workspace;
  initialDate?: string;
}) {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const timezone = workspace.canReadReservations
    ? (workspace.settings?.timezone ?? "Europe/Skopje")
    : "Europe/Skopje";
  const [date, setDate] = useState(() =>
    initialDate && validServiceDate(initialDate)
      ? initialDate
      : localDate(Date.now(), timezone),
  );
  const { reservations, connected, refreshing } = useLiveReservations(
    date,
    workspace.canReadReservations,
  );
  const summary = useQuery(
    api.reservations.getDaySummary,
    workspace.canReadReservations ? { date } : "skip",
  );
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReservationStatusFilter>("all");
  const visibleReservations = useMemo(
    () => filterReservations(reservations ?? [], { search, status }),
    [reservations, search, status],
  );
  const statusCounts = useMemo(
    () => reservations && countReservationStatuses(reservations, search),
    [reservations, search],
  );
  function resetFilters() {
    setSearch("");
    setStatus("all");
  }
  const selectedStatus = useRef<HTMLButtonElement>(null);
  const visitList = useRef<HTMLDivElement>(null);
  const focusedVisit = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const rememberVisitFocus = (event: FocusEvent) => {
      const target = event.target;
      focusedVisit.current =
        target instanceof HTMLElement && visitList.current?.contains(target)
          ? target.closest<HTMLElement>('[data-testid="reservation-row"]')
          : null;
    };
    document.addEventListener("focusin", rememberVisitFocus);
    return () => document.removeEventListener("focusin", rememberVisitFocus);
  }, []);
  useEffect(() => {
    // Live arrival/seating/completion can remove the focused card from a filter.
    // Restore a useful keyboard destination only if focus was lost with that card.
    if (focusedVisit.current && !focusedVisit.current.isConnected) {
      focusedVisit.current = null;
      if (document.activeElement === document.body)
        selectedStatus.current?.focus();
    }
  }, [visibleReservations]);
  const focusedReservation = useRef<string | null>(null);
  useEffect(() => {
    let frame: number | undefined;
    const openLinkedVisit = () => {
      const id = window.location.hash.slice(1);
      if (!id) focusedReservation.current = null;
      const key = `${date}:${id}`;
      if (
        !reservations?.some((row) => id === `reservation-${row._id}`) ||
        focusedReservation.current === key
      )
        return;
      // A link from live service must reveal its visit even when filters hide it.
      // Wait for the visible list to render before focusing the card.
      if (!visibleReservations.some((row) => id === `reservation-${row._id}`)) {
        frame = window.requestAnimationFrame(() => {
          setSearch("");
          setStatus("all");
        });
        return;
      }
      const element = document.getElementById(id);
      if (!element) return;
      focusedReservation.current = key;
      element.focus({ preventScroll: true });
      element.scrollIntoView({ block: "center" });
    };
    openLinkedVisit();
    window.addEventListener("hashchange", openLinkedVisit);
    return () => {
      window.removeEventListener("hashchange", openLinkedVisit);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [reservations, visibleReservations, date]);
  const [erasing, setErasing] = useState<StaffReservation | null>(null);
  const change = useMutation(api.reservations.change);
  const action = useReservationAction();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{
    reservation: StaffReservation;
    mode: ReservationEditMode;
  } | null>(null);
  const dialogVisit = useRef<Id<"reservations"> | null>(null);
  useEffect(() => {
    const reservation = editing?.reservation ?? erasing;
    if (reservation) {
      dialogVisit.current = reservation._id;
      return;
    }
    const id = dialogVisit.current;
    if (!id) return;
    dialogVisit.current = null;
    // A cancellation or guest correction may hide the dialog's original card.
    const frame = window.requestAnimationFrame(() => {
      const destination =
        document.getElementById(`reservation-${id}`) ?? selectedStatus.current;
      destination?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing, erasing]);
  const activeTables = workspace.tables.filter(
    (table) => table.isActive !== false,
  );
  const occupiedTables = activeTables.filter(
    (table) => table.status === "occupied",
  ).length;
  const cleaningTables = activeTables.filter(
    (table) => table.status === "cleaning",
  ).length;
  function changeStatus(
    reservation: StaffReservation,
    next: ReservationQuickAction,
    tableIds?: Id<"tables">[],
  ) {
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
          ...(tableIds ? { tableIds } : {}),
        }),
      copy(messages[next]),
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <DashboardPageHeader
        title={copy("Reservations")}
        description={t(
          "Guests, arrivals and visits, all in one place.",
          "Гости, пристигнувања и посети, сè на едно место.",
          "Mysafirët, mbërritjet dhe vizitat, të gjitha në një vend.",
        )}
        replayPublicTitle
        replayPublicDescription
      >
        <Button
          className="w-full rounded-full sm:w-auto"
          onClick={() => setCreating(true)}
          disabled={!workspace.canCreateReservations || !connected}
        >
          <Plus data-icon="inline-start" />
          {copy("Add reservation")}
        </Button>
      </DashboardPageHeader>
      <VenueSetupGuide workspace={workspace} />
      <ReservationError error={action.error} />
      <section
        className="flex min-w-0 flex-col gap-4 rounded-3xl bg-card p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5"
        aria-label={t(
          "Reservation date and tables",
          "Датум и маси",
          "Data dhe tavolinat",
        )}
      >
        <div className="flex min-w-0 flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
            <ReservationInput
              label={copy("Service date")}
              type="date"
              value={date}
              className="min-w-0 w-full"
              onChange={(event) => {
                if (validServiceDate(event.target.value))
                  setDate(event.target.value);
              }}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setDate(localDate(Date.now(), timezone))}
          >
            {t("Today", "Денес", "Sot")}
          </Button>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:justify-end">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            <Table2 className="size-4 shrink-0" aria-hidden="true" />
            <span>
              {t(
                `Now: ${occupiedTables} occupied · ${cleaningTables} cleaning`,
                `Сега: ${occupiedTables} зафатени · ${cleaningTables} се чистат`,
                `Tani: ${occupiedTables} të zëna · ${cleaningTables} në pastrim`,
              )}
            </span>
          </div>
          <Button asChild variant="ghost" className="shrink-0">
            <Link href="/hospitality/tables">
              {t("View tables", "Види маси", "Shiko tavolinat")}
              <ArrowUpRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
      {summary && <ReservationDayMetrics summary={summary} />}
      {workspace.canReadReservations && (
        <ReservationListFilters
          search={search}
          status={status}
          counts={statusCounts}
          total={reservations?.length}
          visible={visibleReservations.length}
          hasPending={
            reservations?.some((row) => row.status === "pending") ?? false
          }
          selectedStatusRef={selectedStatus}
          onSearchChange={setSearch}
          onStatusChange={setStatus}
          onReset={resetFilters}
        />
      )}
      {workspace.canReadReservations && (
        <div className="flex flex-col gap-2 text-xs text-muted-foreground">
          <p>
            {t(
              `Late after ${workspace.settings?.noShowGraceMins ?? 15} min · Ending soon within 15 min · Overdue after the scheduled end.`,
              `Задоцнување по ${workspace.settings?.noShowGraceMins ?? 15} мин · Завршува во следните 15 мин · Надминато време по закажаниот крај.`,
              `Vonesë pas ${workspace.settings?.noShowGraceMins ?? 15} min · Përfundon brenda 15 min · Koha tejkalohet pas përfundimit të planifikuar.`,
            )}
          </p>
          <p>
            {t(
              "Tables stay held until staff mark them ready. Updates every 30 seconds.",
              "Масите остануваат зафатени додека персоналот не ги означи како подготвени. Се ажурира на секои 30 секунди.",
              "Tavolinat mbeten të mbajtura derisa stafi t’i shënojë gati. Përditësohet çdo 30 sekonda.",
            )}
            {connected && refreshing && reservations && (
              <span>
                {" "}
                {t("Refreshing…", "Се ажурира…", "Duke përditësuar…")}
              </span>
            )}
          </p>
          {!connected && (
            <Alert>
              <AlertDescription>
                {t(
                  "Reconnecting. These indicators may be out of date; actions will be available when the connection returns.",
                  "Повторно поврзување. Показателите може да се застарени; дејствата ќе бидат достапни кога ќе се врати врската.",
                  "Duke u rilidhur. Treguesit mund të jenë të vjetëruar; veprimet do të jenë të disponueshme kur të rikthehet lidhja.",
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      {!workspace.canReadReservations ? (
        <Empty className="rounded-3xl bg-card">
          <EmptyHeader>
            <EmptyTitle>
              {t(
                "Reservation settings need a review",
                "Проверете ги поставките за резервации",
                "Cilësimet e rezervimeve duhen rishikuar",
              )}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                "An owner or manager needs to confirm the reservation settings before this view can load.",
                "Сопственик или менаџер треба да ги потврди поставките пред да се вчита овој приказ.",
                "Pronari ose menaxheri duhet të konfirmojë cilësimet para se të ngarkohet kjo pamje.",
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : reservations === undefined ? (
        <Skeleton className="h-64" />
      ) : reservations.length === 0 ? (
        <Empty className="rounded-3xl bg-card">
          <EmptyHeader>
            <EmptyTitle>
              {copy("No reservations for this service date")}
            </EmptyTitle>
            <EmptyDescription>
              {copy("Online, phone and walk-in reservations will appear here.")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : visibleReservations.length === 0 ? (
        <Empty className="rounded-3xl bg-card">
          <EmptyHeader>
            <EmptyTitle role="heading" aria-level={2}>
              {t(
                "No matching reservations",
                "Нема соодветни резервации",
                "Nuk ka rezervime që përputhen",
              )}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                "Try another name or phone number, change the status, or reset the filters above.",
                "Пробајте друго име или телефон, сменете го статусот или ресетирајте ги филтрите погоре.",
                "Provoni një emër ose telefon tjetër, ndryshoni statusin ose rivendosni filtrat më sipër.",
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div ref={visitList} className="flex min-w-0 flex-col gap-3">
          {visibleReservations.map((reservation) => (
            <ReservationListCard
              key={reservation._id}
              reservation={reservation}
              date={date}
              timezone={timezone}
              owner={workspace.role === "owner"}
              busy={action.busy || !connected}
              showAttention
              onChange={(next, tableIds) =>
                changeStatus(reservation, next, tableIds)
              }
              onEdit={(mode) => setEditing({ reservation, mode })}
              onErase={() => setErasing(reservation)}
            />
          ))}
        </div>
      )}
      {creating && workspace.settings && (
        <ReservationCreateDialog
          date={date}
          settings={workspace.settings}
          onClose={() => setCreating(false)}
          onDateChange={setDate}
        />
      )}
      {editing && (
        <ReservationEditDialog
          reservation={editing.reservation}
          mode={editing.mode}
          onClose={() => setEditing(null)}
          onDateChange={setDate}
        />
      )}
      {erasing && (
        <ReservationGuestEraseDialog
          reservation={erasing}
          onClose={() => setErasing(null)}
        />
      )}
    </div>
  );
}
