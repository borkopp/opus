"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useState } from "react";
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
import {
  ReservationListCard,
  type ReservationQuickAction,
} from "./ReservationListCard";
import type { Id } from "@/convex/_generated/dataModel";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { ReservationError, ReservationInput } from "./ReservationFields";
import { ReservationCreateDialog } from "./ReservationCreateDialog";
import { VenueSetupGuide } from "./VenueSetupGuide";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const reservations = useQuery(
    api.reservations.listDay,
    workspace.canReadReservations ? { date } : "skip",
  );
  const summary = useQuery(
    api.reservations.getDaySummary,
    workspace.canReadReservations ? { date } : "skip",
  );
  const eraseGuest = useMutation(api.reservations.eraseGuest);
  const [erasing, setErasing] = useState<StaffReservation | null>(null);
  const change = useMutation(api.reservations.change);
  const action = useReservationAction();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{
    reservation: StaffReservation;
    mode: ReservationEditMode;
  } | null>(null);
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
          disabled={!workspace.settings || !workspace.readiness.ready}
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
      ) : (
        <div className="flex min-w-0 flex-col gap-3">
          {reservations.map((reservation) => (
            <ReservationListCard
              key={reservation._id}
              reservation={reservation}
              date={date}
              timezone={timezone}
              owner={workspace.role === "owner"}
              busy={action.busy}
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
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !action.busy) setErasing(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{copy("Anonymize guest details?")}</DialogTitle>
              <DialogDescription>
                {copy(
                  "This removes guest details, account links and email management links from all of this guest’s reservations at this venue. Reservations and table assignments remain. Historical audit records are retained.",
                )}
              </DialogDescription>
            </DialogHeader>
            <p className="font-medium">{erasing.customerName}</p>
            <ReservationError error={action.error} />
            <DialogFooter>
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={() => setErasing(null)}
              >
                {copy("Cancel")}
              </Button>
              <Button
                variant="destructive"
                disabled={action.busy}
                onClick={() =>
                  void action
                    .run(
                      () => eraseGuest({ customerId: erasing.customerId }),
                      copy("Guest details anonymized"),
                    )
                    .then((saved) => {
                      if (saved) setErasing(null);
                    })
                }
              >
                {copy("Anonymize guest")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
