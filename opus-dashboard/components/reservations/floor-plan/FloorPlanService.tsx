"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowLeft,
  DraftingCompass,
  Hand,
  Maximize,
  MousePointer2,
  RefreshCw,
  Table2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useLiveReservationFloor } from "@/hooks/use-live-reservation-floor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { floorPlanDraft } from "@/lib/floor-plan-snapshot";
import { floorStatusPresentation } from "@/lib/reservation-floor-presentation";
import { reservationTime } from "@/lib/reservation-format";
import { ReservationSelect } from "../ReservationFields";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
import { FloorToolButton } from "./FloorPlanToolbar";
import { FloorPlanServicePanel } from "./FloorPlanServicePanel";
import { FloorPlanWalkInDialog } from "./FloorPlanWalkInDialog";

type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;
type Snapshot = FunctionReturnType<typeof api.floorPlans.get>;
const noEdit = () => {};

export function FloorPlanService({
  workspace,
  snapshot,
  onArea,
}: {
  workspace: Workspace;
  snapshot: Snapshot;
  onArea: (id: string) => void;
}) {
  const { t, locale } = useDashboardI18n();
  const { live, refreshed, refresh, refreshKey, connected } =
    useLiveReservationFloor();
  const panel = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [walkIn, setWalkIn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fitKey, setFitKey] = useState(0);
  const [tool, setTool] = useState<"select" | "pan">("select");
  useEffect(() => {
    if (selectedId && window.matchMedia("(max-width: 1279px)").matches) {
      panel.current?.scrollIntoView({ block: "start" });
      panel.current?.focus({ preventScroll: true });
    }
  }, [selectedId]);
  const table = snapshot.tables.find((row) => row._id === selectedId);
  const liveTables = new Map(
    live?.tables.map((row) => [row.tableId as string, row]),
  );
  const selectedLive = table ? liveTables.get(table._id) : undefined;
  const canManage = workspace.role !== "staff";
  const highlighted = selectedLive?.current ?? selectedLive?.next;
  const sharedTables = highlighted
    ? (live?.tables
        .filter(
          (row) =>
            row.current?.reservationId === highlighted.reservationId ||
            row.next?.reservationId === highlighted.reservationId,
        )
        .map((row) => row.tableId) ?? [])
    : [];
  const display = new Map(
    snapshot.tables.map((row) => {
      const state = liveTables.get(row._id);
      const presentation =
        floorStatusPresentation[state?.status ?? "needs_review"];
      const visit = state?.current ?? state?.next;
      const detail = visit
        ? `${visit.guestName} · ${visit.partySize} ${t("guests", "гости", "mysafirë")} · ${reservationTime(visit.startAt, live!.timezone, locale)}`
        : `${row.capacity} ${t("seats", "места", "vende")}`;
      return [
        row._id as string,
        {
          label: t(...presentation.label),
          detail,
          className: presentation.shape,
          attention: Boolean(
            state?.overdue || state?.late || state?.status === "needs_review",
          ),
        },
      ];
    }),
  );
  const select = (id?: string) => {
    setSelectedId(id);
    setWalkIn(false);
  };
  return (
    <div
      className="flex min-w-0 flex-col gap-5"
      data-testid="floor-plan-service"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={t(
              "Back to tables",
              "Назад кон масите",
              "Kthehu te tavolinat",
            )}
          >
            <Link href="/hospitality/tables">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {t("Floor plan", "План на просторот", "Plani i lokalit")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t(
                "Select a table to seat guests and manage their visit.",
                "Изберете маса за сместување гости и управување со посетата.",
                "Zgjidhni një tavolinë për të ulur mysafirët dhe menaxhuar vizitën.",
              )}
            </p>
          </div>
        </div>
        {canManage && (
          <Button asChild variant="outline">
            <Link
              href={`/hospitality/tables/floor-plan?mode=edit&area=${snapshot.area._id}`}
            >
              <DraftingCompass data-icon="inline-start" />
              {t("Edit layout", "Уреди распоред", "Redakto planin")}
            </Link>
          </Button>
        )}
      </header>
      {!workspace.canReadReservations && (
        <Alert>
          <AlertDescription>
            {t(
              "Reservation settings need review. An owner or manager can check Hours & rules in Venue setup.",
              "Потребна е проверка на поставките. Сопственик или менаџер може да ги провери Часови и правила во Поставување локал.",
              "Cilësimet e rezervimeve duhen rishikuar. Pronari ose menaxheri mund të kontrollojë Orarin dhe rregullat te Konfigurimi i lokalit.",
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="w-full sm:w-56">
              <ReservationSelect
                label={t("Area", "Простор", "Zona")}
                value={snapshot.area._id}
                onChange={onArea}
                options={workspace.areas.map((area) => ({
                  value: area._id,
                  label: `${area.name}${area.isActive ? "" : ` · ${t("Inactive", "Неактивна", "Joaktive")}`}`,
                }))}
              />
            </div>
            <div
              className="flex items-center gap-2 text-xs text-muted-foreground"
              role="status"
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  connected ? "bg-success" : "bg-muted-foreground",
                )}
                aria-hidden
              />
              {!connected
                ? t("Reconnecting…", "Повторно поврзување…", "Duke u rilidhur…")
                : live
                  ? t(
                      `Live · ${reservationTime(live.asOf, live.timezone, locale)}`,
                      `Во живо · ${reservationTime(live.asOf, live.timezone, locale)}`,
                      `Drejtpërdrejt · ${reservationTime(live.asOf, live.timezone, locale)}`,
                    )
                  : t(
                      "Loading service…",
                      "Се вчитуваат посетите…",
                      "Duke ngarkuar shërbimin…",
                    )}
              <Button
                size="icon"
                variant="ghost"
                disabled={!refreshed}
                onClick={refresh}
                aria-label={t(
                  "Refresh live status",
                  "Освежи состојба",
                  "Rifresko gjendjen",
                )}
              >
                <RefreshCw />
              </Button>
            </div>
          </div>
          <TooltipProvider>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-1.5">
              <div className="flex items-center gap-1">
                <FloorToolButton
                  icon={MousePointer2}
                  label={t("Select table", "Избери маса", "Zgjidh tavolinë")}
                  aria-pressed={tool === "select"}
                  variant={tool === "select" ? "secondary" : "ghost"}
                  onClick={() => setTool("select")}
                />
                <FloorToolButton
                  icon={Hand}
                  label={t("Pan view", "Помести приказ", "Lëviz pamjen")}
                  aria-pressed={tool === "pan"}
                  variant={tool === "pan" ? "secondary" : "ghost"}
                  onClick={() => setTool("pan")}
                />
              </div>
              <div className="flex items-center gap-1">
                <FloorToolButton
                  icon={ZoomOut}
                  label={t("Zoom out", "Оддалечи", "Zvogëlo")}
                  disabled={zoom <= 0.5}
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                />
                <span className="w-11 text-center text-xs tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <FloorToolButton
                  icon={ZoomIn}
                  label={t("Zoom in", "Приближи", "Zmadho")}
                  disabled={zoom >= 3}
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                />
                <FloorToolButton
                  icon={Maximize}
                  label={t(
                    "Fit room",
                    "Прикажи цел простор",
                    "Përshtat dhomën",
                  )}
                  onClick={() => {
                    setZoom(1);
                    setFitKey(fitKey + 1);
                  }}
                />
              </div>
            </div>
          </TooltipProvider>
          {!live ? (
            <Skeleton className="h-96" />
          ) : (
            <FloorPlanCanvas
              draft={floorPlanDraft(snapshot)}
              selected={table ? [table._id] : []}
              onSelect={(ids) => select(ids[0])}
              onCommit={noEdit}
              snap={false}
              grid={false}
              tool={tool}
              zoom={zoom}
              fitKey={fitKey}
              disabled={false}
              highlighted={sharedTables.length > 1 ? sharedTables : []}
              service={display}
              tables={
                new Map(
                  snapshot.tables.map((row) => [
                    row._id,
                    {
                      capacity: row.capacity,
                      active:
                        row.isActive !== false &&
                        row.status !== "inactive" &&
                        snapshot.area.isActive,
                    },
                  ]),
                )
              }
              onUndo={noEdit}
              onRedo={noEdit}
              onDelete={noEdit}
              onDuplicate={noEdit}
            />
          )}
          <div
            className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-xs text-muted-foreground"
            aria-label={t(
              "Table status legend",
              "Легенда за масите",
              "Legjenda e tavolinave",
            )}
          >
            {(["available", "reserved", "occupied", "cleaning"] as const).map(
              (status) => (
                <span key={status} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      floorStatusPresentation[status].dot,
                    )}
                    aria-hidden
                  />
                  {t(...floorStatusPresentation[status].label)}
                </span>
              ),
            )}
          </div>
        </div>
        <div
          ref={panel}
          tabIndex={-1}
          className="min-w-0 scroll-mt-20 outline-none xl:sticky xl:top-4 xl:col-start-2 xl:row-span-2 xl:row-start-1"
        >
          {table && live ? (
            <FloorPlanServicePanel
              key={table._id}
              workspace={workspace}
              table={table}
              live={selectedLive}
              timezone={live.timezone}
              refreshed={refreshed}
              onWalkIn={() => setWalkIn(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-12 text-center">
              <Table2 className="size-8 text-muted-foreground" />
              <h2 className="font-medium">
                {t("Choose a table", "Изберете маса", "Zgjidhni një tavolinë")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t(
                  "See its guests, next reservation and available actions here.",
                  "Тука се прикажуваат гостите, следната резервација и достапните дејства.",
                  "Shikoni këtu mysafirët, rezervimin e ardhshëm dhe veprimet e disponueshme.",
                )}
              </p>
            </div>
          )}
        </div>
        <section
          className="flex min-w-0 flex-col gap-3 xl:col-start-1"
          aria-label={t(
            "Tables in this area",
            "Маси во овој простор",
            "Tavolinat në këtë zonë",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">
              {t(
                "Tables in this area",
                "Маси во овој простор",
                "Tavolinat në këtë zonë",
              )}
            </h2>
            <span className="text-xs text-muted-foreground">
              {snapshot.tables.length}
            </span>
          </div>
          {!snapshot.tables.length && (
            <p className="text-sm text-muted-foreground">
              {t(
                "No tables yet. An owner or manager can add them in Edit layout.",
                "Сè уште нема маси. Сопственик или менаџер може да ги додаде во Уреди распоред.",
                "Nuk ka ende tavolina. Pronari ose menaxheri mund t’i shtojë te Redakto planin.",
              )}
            </p>
          )}
          <div className="grid min-w-0 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
            {snapshot.tables.map((row) => {
              const state = liveTables.get(row._id);
              const data = display.get(row._id)!;
              return (
                <button
                  key={row._id}
                  type="button"
                  data-testid={`service-table-${row._id}`}
                  aria-label={t(
                    `Select table ${row.label}`,
                    `Избери маса ${row.label}`,
                    `Zgjidh tavolinën ${row.label}`,
                  )}
                  aria-pressed={table?._id === row._id}
                  onClick={() => select(row._id)}
                  className={cn(
                    "flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-3 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
                    table?._id === row._id &&
                      "border-primary ring-1 ring-primary",
                  )}
                >
                  <span className="flex w-full min-w-0 items-center justify-between gap-2">
                    <span className="truncate font-medium">{row.label}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {row.capacity} {t("seats", "места", "vende")}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-xs">
                    <span>{live ? data.label : "…"}</span>
                    {state?.overdue && (
                      <Badge variant="danger">
                        {t("Overdue", "Надминато време", "Koha e tejkaluar")}
                      </Badge>
                    )}
                    {state?.late && (
                      <Badge variant="danger">
                        {t("Late arrival", "Доцни", "Mbërritje e vonuar")}
                      </Badge>
                    )}
                  </span>
                  {(state?.current || state?.next) && (
                    <span className="w-full truncate text-xs text-muted-foreground">
                      {data.detail}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
      {walkIn && table && workspace.settings && (
        <FloorPlanWalkInDialog
          table={table}
          settings={workspace.settings}
          refreshKey={refreshKey}
          onClose={() => setWalkIn(false)}
          onSeated={refresh}
        />
      )}
    </div>
  );
}
