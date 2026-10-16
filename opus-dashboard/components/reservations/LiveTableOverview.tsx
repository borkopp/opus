"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { ArrowUpRight, Table2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useLiveReservationFloor } from "@/hooks/use-live-reservation-floor";
import { reservationDateTime, reservationTime } from "@/lib/reservation-format";
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationError } from "./ReservationFields";

type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;
type LiveFloor = FunctionReturnType<typeof api.hospitality.getLiveTables>;
type LiveTable = LiveFloor["tables"][number];
type Visit = NonNullable<LiveTable["current"]>;

export function LiveTableOverview({ workspace }: { workspace: Workspace }) {
  const copy = useReservationCopy();
  const { t, locale } = useDashboardI18n();
  const { live, refreshed } = useLiveReservationFloor();
  const change = useMutation(api.reservations.change);
  const action = useReservationAction();
  const [actionTable, setActionTable] = useState<Id<"tables">>();

  function changeVisit(
    tableId: Id<"tables">,
    visit: Visit,
    next: "complete" | "ready",
  ) {
    setActionTable(tableId);
    void action.run(
      () =>
        change({
          reservationId: visit.reservationId,
          expectedRevision: visit.revision,
          action: next,
          ...(next === "ready" ? { tableIds: [tableId] } : {}),
        }),
      copy(
        next === "ready"
          ? "Table ready"
          : "Visit finished; tables need resetting",
      ),
    );
  }

  if (!workspace.tables.length)
    return (
      <Empty className="rounded-3xl bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Table2 />
          </EmptyMedia>
          <EmptyTitle>
            {t(
              "Your tables will appear here",
              "Масите ќе се прикажат тука",
              "Tavolinat tuaja do të shfaqen këtu",
            )}
          </EmptyTitle>
          <EmptyDescription>
            {workspace.role === "staff"
              ? t(
                  "An owner or manager can add the venue’s tables.",
                  "Сопственик или менаџер може да ги додаде масите.",
                  "Pronari ose menaxheri mund të shtojë tavolinat.",
                )
              : t(
                  "Add tables, then arrange them into areas and optional combinations.",
                  "Додајте маси, па организирајте ги во зони и опционални комбинации.",
                  "Shtoni tavolina, pastaj organizojini në zona dhe kombinime opsionale.",
                )}
          </EmptyDescription>
        </EmptyHeader>
        {workspace.role !== "staff" && (
          <Button asChild>
            <Link href="/hospitality/tables?tab=tables">
              {copy("Add table")}
            </Link>
          </Button>
        )}
      </Empty>
    );
  if (!live) return <Skeleton className="h-72" />;

  const groups = [
    ...workspace.areas.map((area) => ({
      id: area._id,
      name: area.name,
      active: area.isActive,
      tables: workspace.tables.filter(
        (table) => table.floorPlanId === area._id,
      ),
    })),
    {
      id: "other",
      name: t("Other tables", "Други маси", "Tavolina të tjera"),
      active: false,
      tables: workspace.tables.filter(
        (table) =>
          !workspace.areas.some((area) => area._id === table.floorPlanId),
      ),
    },
  ].filter((group) => group.tables.length);
  const liveTables = new Map(
    live.tables.map((table) => [table.tableId, table]),
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {t(
          `Live service · Updated ${reservationTime(live.asOf, live.timezone, locale)} · Refreshes every 30 seconds`,
          `Тековни посети · Ажурирано во ${reservationTime(live.asOf, live.timezone, locale)} · Се освежува на секои 30 секунди`,
          `Shërbimi aktual · Përditësuar në ${reservationTime(live.asOf, live.timezone, locale)} · Rifreskohet çdo 30 sekonda`,
        )}
      </p>
      {!workspace.canReadReservations && (
        <Alert>
          <AlertDescription>
            {t(
              "Table state is visible, but reservation settings need review before visit actions are available. An owner or manager can review Hours & rules in Venue setup.",
              "Состојбата на масите е видлива, но поставките треба да се проверат пред да се менуваат посетите. Сопственик или менаџер може да ги провери Часови и правила во Поставување локал.",
              "Gjendja e tavolinave është e dukshme, por cilësimet duhen rishikuar para veprimeve të vizitave. Pronari ose menaxheri mund të rishikojë Orarin dhe rregullat te Konfigurimi i lokalit.",
            )}
          </AlertDescription>
        </Alert>
      )}
      {groups.map((group) => (
        <section
          key={group.id}
          className="flex min-w-0 flex-col gap-3"
          aria-label={group.name}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium [overflow-wrap:anywhere]">
              {group.name}
            </h2>
            {!group.active && (
              <Badge variant="secondary">{copy("Inactive")}</Badge>
            )}
          </div>
          <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {group.tables.map((table) => (
              <LiveTableCard
                key={table._id}
                table={table}
                live={liveTables.get(table._id)}
                areaActive={group.active}
                timezone={live.timezone}
                busy={
                  action.busy || !refreshed || !workspace.canReadReservations
                }
                error={actionTable === table._id ? action.error : null}
                onChange={(visit, next) => changeVisit(table._id, visit, next)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function LiveTableCard({
  table,
  live,
  areaActive,
  timezone,
  busy,
  error,
  onChange,
}: {
  table: Workspace["tables"][number];
  live: LiveTable | undefined;
  areaActive: boolean;
  timezone: string;
  busy: boolean;
  error: string | null;
  onChange: (visit: Visit, action: "complete" | "ready") => void;
}) {
  const copy = useReservationCopy();
  const { t, locale } = useDashboardI18n();
  const status = live?.status ?? "needs_review";
  const needsReview = status === "needs_review";
  const when = (instant: number) =>
    reservationDateTime(instant, timezone, locale);
  const statusLabel =
    status === "needs_review"
      ? t("Needs review", "Потребна е проверка", "Kërkon rishikim")
      : status === "closed"
        ? t("Closed", "Затворена", "E mbyllur")
        : status === "reserved"
          ? t("Reserved", "Резервирана", "E rezervuar")
          : copy(status);
  return (
    <Card
      className="min-w-0 rounded-3xl"
      data-testid="live-table-card"
      role="article"
      aria-label={table.label}
    >
      <CardHeader>
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
          <CardTitle className="[overflow-wrap:anywhere]">
            {table.label}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                needsReview
                  ? "danger"
                  : status === "occupied"
                    ? "success"
                    : "secondary"
              }
            >
              {statusLabel}
            </Badge>
            {areaActive && live?.inactive && status !== "inactive" && (
              <Badge variant="outline">{copy("Inactive")}</Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {table.minCapacity ?? 1}–{table.capacity} {copy("guests")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex min-w-0 flex-col gap-4">
        {needsReview && (
          <Alert>
            <AlertDescription>
              {t(
                "This table has an unresolved allocation. Review its reservations before changing its state.",
                "Оваа маса има неразјаснета распределба. Проверете ги резервациите пред да ја смените состојбата.",
                "Kjo tavolinë ka një caktim të pazgjidhur. Rishikoni rezervimet para se të ndryshoni gjendjen.",
              )}
            </AlertDescription>
          </Alert>
        )}
        {live?.current && (
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                {t("Current visit", "Тековна посета", "Vizita aktuale")}
              </p>
              {live.overdue && (
                <Badge variant="danger">
                  {t("Overdue", "Надминато време", "Koha e tejkaluar")}
                </Badge>
              )}
            </div>
            <VisitDetails visit={live.current} />
            <p className="text-sm text-muted-foreground">
              {t("Expected finish", "Очекуван крај", "Përfundimi i pritshëm")}:{" "}
              {when(live.current.endAt)}
            </p>
            {live.current.seatedAt !== undefined && (
              <p className="text-sm text-muted-foreground">
                {t("Seated at", "Сместени во", "U ulën në")}:{" "}
                {when(live.current.seatedAt)}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <VisitLink visit={live.current} />
              {!needsReview && live.current.status === "seated" && (
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => onChange(live.current!, "complete")}
                >
                  {copy("Finish visit")}
                </Button>
              )}
            </div>
            {!needsReview && live.current.status === "seated" && (
              <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {t(
                  `Finishing ends this party’s visit on all its tables (${live.current.tableLabels.join(" + ")}) and starts their cleaning buffer.`,
                  `Завршувањето ја завршува посетата на групата на сите нејзини маси (${live.current.tableLabels.join(" + ")}) и го започнува времето за подготовка.`,
                  `Përfundimi mbyll vizitën e grupit në të gjitha tavolinat e tij (${live.current.tableLabels.join(" + ")}) dhe nis kohën e pastrimit.`,
                )}
              </p>
            )}
          </div>
        )}
        {live?.cleaning.map((visit) => (
          <div
            key={visit.reservationId}
            className="flex min-w-0 flex-col gap-3"
          >
            {live.current && <Separator />}
            <p className="text-sm font-medium">
              {t("Table reset", "Подготовка на маса", "Përgatitja e tavolinës")}
            </p>
            <VisitDetails visit={visit} />
            <p className="text-sm text-muted-foreground">
              {t(
                "Reset buffer ends",
                "Подготовката завршува",
                "Koha e pastrimit mbaron",
              )}
              : {when(visit.readyAt)}
            </p>
            {visit.canRelease && (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Cleaning buffer elapsed. Mark ready when the table is reset.",
                  "Времето за подготовка помина. Означете како подготвена кога масата ќе биде средена.",
                  "Koha e pastrimit ka kaluar. Shënojeni gati kur tavolina të jetë përgatitur.",
                )}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <VisitLink visit={visit} />
              {!needsReview && (
                <Button
                  className="h-auto min-h-9 whitespace-normal py-2 text-left"
                  size="sm"
                  variant="outline"
                  disabled={busy || !visit.canRelease}
                  onClick={() => onChange(visit, "ready")}
                >
                  {copy("Mark")} {table.label} {copy("ready")}
                </Button>
              )}
            </div>
          </div>
        ))}
        {live?.next && (
          <div className="flex min-w-0 flex-col gap-3">
            {(live.current || live.cleaning.length > 0) && <Separator />}
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                {t(
                  "Next reservation",
                  "Следна резервација",
                  "Rezervimi i radhës",
                )}
              </p>
              {live.late && (
                <Badge variant="highlight">
                  {t("Late arrival", "Доцни", "Mbërritje me vonesë")}
                </Badge>
              )}
              {live.next.arrivedAt !== undefined && (
                <Badge variant="brand-soft">{copy("Arrived")}</Badge>
              )}
            </div>
            <VisitDetails visit={live.next} />
            <p className="text-sm text-muted-foreground">
              {when(live.next.startAt)} – {when(live.next.endAt)}
            </p>
            <VisitLink visit={live.next} />
          </div>
        )}
        {live?.closure && (
          <Alert>
            <AlertDescription>
              <p>
                {t("Closure", "Затворање", "Mbyllje")}:{" "}
                <span className="[overflow-wrap:anywhere]">
                  {live.closure.reason}
                </span>
              </p>
              <p>
                {when(live.closure.startAt)} – {when(live.closure.endAt)}
              </p>
            </AlertDescription>
          </Alert>
        )}
        {status === "available" && !live?.next && (
          <p className="text-sm text-muted-foreground">
            {t(
              "No upcoming reservation.",
              "Нема претстојна резервација.",
              "Nuk ka rezervim të ardhshëm.",
            )}
          </p>
        )}
        {status === "inactive" && (
          <p className="text-sm text-muted-foreground">
            {t(
              "Unavailable for new reservations.",
              "Не е достапна за нови резервации.",
              "Nuk është e disponueshme për rezervime të reja.",
            )}
          </p>
        )}
        <ReservationError error={error} />
      </CardContent>
    </Card>
  );
}

function VisitDetails({ visit }: { visit: Visit }) {
  const { t } = useDashboardI18n();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p className="font-medium [overflow-wrap:anywhere]">{visit.guestName}</p>
      <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
        {t(
          `${visit.partySize} guests`,
          `${visit.partySize} гости`,
          `${visit.partySize} mysafirë`,
        )}{" "}
        · {visit.tableLabels.join(" + ")}
      </p>
    </div>
  );
}

function VisitLink({ visit }: { visit: Visit }) {
  const { t } = useDashboardI18n();
  return (
    <Button asChild size="sm" variant="outline" className="self-start">
      <Link
        href={`/hospitality?date=${encodeURIComponent(visit.serviceDate)}#reservation-${visit.reservationId}`}
      >
        {t("View reservation", "Види резервација", "Shiko rezervimin")}
        <ArrowUpRight data-icon="inline-end" />
      </Link>
    </Button>
  );
}
