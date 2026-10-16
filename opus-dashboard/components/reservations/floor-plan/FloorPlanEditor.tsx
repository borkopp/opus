"use client";

import { useEffect, useState } from "react";
import { floorPlanDraft } from "@/lib/floor-plan-snapshot";
import { readFloorPlanRecovery } from "@/lib/floor-plan-recovery";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowLeft,
  Check,
  Layers,
  LockKeyhole,
  Plus,
  Save,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";
import { ReservationError, ReservationSelect } from "../ReservationFields";
import {
  ResourceEditor,
  type VenueResourceEditorState,
} from "../VenueResources";
import { FloorPlanCanvas } from "./FloorPlanCanvas";
import { FloorPlanInspector } from "./FloorPlanInspector";
import { FloorPlanToolbar } from "./FloorPlanToolbar";
import {
  alignFloorItems,
  arrangeFloorTables,
  clampFloorItem,
  createFloorFixture,
  distributeFloorItems,
  findFloorTableOverlaps,
  getFloorItemBounds,
  type FloorPlanDraft,
} from "@/lib/floor-plan";

type Snapshot = FunctionReturnType<typeof api.floorPlans.get>;
type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;
function version(snapshot: Snapshot) {
  return `${snapshot.area.layoutRevision}:${snapshot.tables
    .map((table) => table._id)
    .sort()
    .join(",")}`;
}

export function FloorPlanEditor({
  snapshot,
  workspace,
  onArea,
  onReset,
}: {
  snapshot: Snapshot;
  workspace: Workspace;
  onArea: (id: string) => void;
  onReset: () => void;
}) {
  const { t } = useDashboardI18n();
  const router = useRouter();
  const save = useMutation(api.floorPlans.save);
  const action = useReservationAction();
  const recoveryKey = `opus-floor-draft:${snapshot.viewerId}:${workspace.org._id}:${snapshot.area._id}`;
  const [recovery] = useState(() => {
    try {
      return typeof window === "undefined"
        ? null
        : readFloorPlanRecovery(sessionStorage.getItem(recoveryKey));
    } catch {
      return null;
    }
  });
  const [baseline, setBaseline] = useState(
    () =>
      recovery?.baseline ?? {
        version: version(snapshot),
        revision: snapshot.area.layoutRevision,
        draft: floorPlanDraft(snapshot),
      },
  );
  const [history, setHistory] = useState<FloorPlanDraft[]>(() => [
    recovery?.draft ?? floorPlanDraft(snapshot),
  ]);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [zoom, setZoom] = useState(1);
  const [fitKey, setFitKey] = useState(0);
  const [combination, setCombination] = useState("none");
  const [pending, setPending] = useState<(() => void) | null>(null);
  const [resource, setResource] = useState<VenueResourceEditorState | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(() =>
    recovery
      ? t(
          "Your unsaved layout was recovered in this tab. Save it when ready.",
          "Незачуваниот план е вратен во овој таб. Зачувајте го кога ќе биде подготвен.",
          "Plani juaj i paruajtur u rikthye në këtë skedë. Ruajeni kur të jeni gati.",
        )
      : null,
  );
  const draft = history[cursor];
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline.draft);
  const changedElsewhere = baseline.version !== version(snapshot);
  // Adopt remote updates only when there is no local draft to preserve.
  if (changedElsewhere && !dirty && !action.busy) {
    const updated = floorPlanDraft(snapshot);
    setBaseline({
      version: version(snapshot),
      revision: snapshot.area.layoutRevision,
      draft: updated,
    });
    setHistory([updated]);
    setCursor(0);
    setSelected([]);
  }
  const stale = changedElsewhere && dirty;
  const disabled = action.busy || stale;
  const selection = draft.items.filter((item) => selected.includes(item.id));
  const overlaps = findFloorTableOverlaps(draft.items);
  const highlighted =
    snapshot.combinations.find((row) => row._id === combination)?.tableIds ??
    [];
  const tableMeta = new Map(
    snapshot.tables.map((table) => [
      table._id as string,
      {
        capacity: table.capacity,
        active:
          snapshot.area.isActive &&
          table.isActive !== false &&
          table.status !== "inactive",
      },
    ]),
  );
  const tableLabels = new Map(
    snapshot.tables.map((table) => [table._id as string, table.label]),
  );
  const visibleDraft = {
    ...draft,
    items: draft.items.map((item) =>
      item.kind === "table"
        ? { ...item, label: tableLabels.get(item.id) ?? item.label }
        : item,
    ),
  };

  function commit(next: FloorPlanDraft) {
    if (disabled || JSON.stringify(next) === JSON.stringify(draft)) return;
    setHistory([...history.slice(0, cursor + 1), next].slice(-80));
    setCursor(Math.min(cursor + 1, 79));
    setNotice(null);
  }
  function undo() {
    if (!disabled) {
      setCursor(Math.max(0, cursor - 1));
      setNotice(null);
    }
  }
  function redo() {
    if (!disabled) {
      setCursor(Math.min(history.length - 1, cursor + 1));
      setNotice(null);
    }
  }
  function request(next: () => void) {
    if (action.busy) return;
    if (dirty) setPending(() => next);
    else next();
  }
  function removeFixtures() {
    commit({
      ...draft,
      items: draft.items.filter(
        (item) =>
          !selected.includes(item.id) || item.kind === "table" || item.locked,
      ),
    });
    setSelected(
      selection
        .filter((item) => item.kind === "table" || item.locked)
        .map((item) => item.id),
    );
  }
  function duplicateFixtures() {
    const copies = selection
      .filter((item) => item.kind !== "table" && !item.locked)
      .map((item) =>
        clampFloorItem(
          {
            ...item,
            id: `fixture-${crypto.randomUUID()}`,
            x: item.x + 20,
            y: item.y + 20,
          },
          draft,
        ),
      );
    if (!copies.length) return;
    if (
      draft.items.filter((item) => item.kind !== "table").length +
        copies.length >
      200
    ) {
      setNotice(
        t(
          "Each room supports up to 200 fixtures.",
          "Секој простор поддржува до 200 објекти.",
          "Çdo dhomë mbështet deri në 200 objekte.",
        ),
      );
      return;
    }
    commit({ ...draft, items: [...draft.items, ...copies] });
    setSelected(copies.map((item) => item.id));
  }
  async function persist() {
    if (disabled || !dirty) return false;
    let revision = baseline.revision;
    const success = await action.run(
      async () => {
        const result = await save({
          areaId: snapshot.area._id,
          expectedRevision: baseline.revision,
          canvasWidth: draft.width,
          canvasHeight: draft.height,
          tables: draft.items
            .filter((item) => item.kind === "table")
            .map(({ id, x, y, width, height, rotation, shape, locked }) => ({
              tableId: id as Id<"tables">,
              x,
              y,
              width,
              height,
              rotation,
              shape: shape ?? "rectangle",
              locked,
            })),
          fixtures: draft.items
            .filter((item) => item.kind !== "table")
            .map(
              ({ id, kind, label, x, y, width, height, rotation, locked }) => ({
                id,
                kind: kind as "wall" | "bar" | "door" | "plant" | "label",
                label,
                x,
                y,
                width,
                height,
                rotation,
                locked,
              }),
            ),
        });
        revision = result.revision;
      },
      t("Floor plan saved", "Планот е зачуван", "Plani u ruajt"),
    );
    if (success) {
      clearRecovery();
      setBaseline({
        version: `${revision}:${snapshot.tables
          .map((table) => table._id)
          .sort()
          .join(",")}`,
        revision,
        draft,
      });
      setNotice(null);
    }
    return success;
  }
  useEffect(() => {
    try {
      if (dirty)
        sessionStorage.setItem(
          recoveryKey,
          JSON.stringify({ baseline, draft }),
        );
      else sessionStorage.removeItem(recoveryKey);
    } catch {
      /* Saving to the server still works when browser storage is unavailable. */
    }
  }, [recoveryKey, baseline, draft, dirty]);
  function clearRecovery() {
    try {
      sessionStorage.removeItem(recoveryKey);
    } catch {
      /* Storage may be disabled. */
    }
  }
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.href === window.location.href ||
        anchor.getAttribute("href")?.startsWith("#")
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (action.busy) return;
      setPending(() => () => {
        if (anchor.origin === window.location.origin)
          router.push(`${anchor.pathname}${anchor.search}${anchor.hash}`);
        else window.location.assign(anchor.href);
      });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, action.busy, router]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="flex min-w-0 flex-col gap-4"
        data-testid="floor-plan-editor"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              aria-label={t(
                "Back to tables",
                "Назад кон масите",
                "Kthehu te tavolinat",
              )}
              disabled={action.busy}
              onClick={() => request(() => router.push("/hospitality/tables"))}
            >
              <ArrowLeft />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("Floor plan", "План на просторот", "Plani i lokalit")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Make the space feel familiar to your team.",
                  "Просторот што вашиот тим го познава.",
                  "Bëjeni hapësirën të njohur për ekipin.",
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              disabled={action.busy}
              onClick={() =>
                request(() =>
                  router.push(
                    `/hospitality/tables/floor-plan?area=${snapshot.area._id}`,
                  ),
                )
              }
            >
              {t("Live service", "Тековни посети", "Shërbimi aktual")}
            </Button>
            <Badge variant={dirty ? "secondary" : "outline"} aria-live="polite">
              {dirty ? (
                t(
                  "Unsaved changes",
                  "Незачувани промени",
                  "Ndryshime të paruajtura",
                )
              ) : (
                <>
                  <Check data-icon="inline-start" />
                  {t("Saved", "Зачувано", "U ruajt")}
                </>
              )}
            </Badge>
            <Button
              variant="outline"
              disabled={!dirty || action.busy}
              onClick={() => request(onReset)}
            >
              {t("Discard", "Отфрли", "Hidh poshtë")}
            </Button>
            <Button
              disabled={!dirty || disabled}
              onClick={() => void persist()}
            >
              {action.busy ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              <span className="hidden sm:inline">
                {t("Save layout", "Зачувај план", "Ruaj planin")}
              </span>
              <span className="sm:hidden">{t("Save", "Зачувај", "Ruaj")}</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56 max-w-full">
            <ReservationSelect
              label={t("Area", "Простор", "Zona")}
              value={snapshot.area._id}
              onChange={(id) => request(() => onArea(id))}
              disabled={action.busy}
              options={workspace.areas.map((area) => ({
                value: area._id,
                label: `${area.name}${area.isActive ? "" : ` (${t("inactive", "неактивен", "joaktiv")})`}`,
              }))}
            />
          </div>
          <Button
            variant="outline"
            disabled={action.busy}
            onClick={() => request(() => setResource({ kind: "area" }))}
          >
            <Plus data-icon="inline-start" />
            {t("Add area", "Додај простор", "Shto zonë")}
          </Button>
          <div className="w-60 max-w-full sm:ml-auto">
            <ReservationSelect
              label={t(
                "Highlight combination",
                "Прикажи комбинација",
                "Thekso kombinimin",
              )}
              value={combination}
              onChange={setCombination}
              options={[
                {
                  value: "none",
                  label: t("All tables", "Сите маси", "Të gjitha tavolinat"),
                },
                ...snapshot.combinations
                  .filter((row) => row.isActive)
                  .map((row) => ({
                    value: row._id,
                    label: `${row.name} · ${row.capacity} ${t("seats", "места", "vende")}`,
                  })),
              ]}
            />
          </div>
        </div>
        <ReservationError error={action.error} />
        {stale && (
          <Alert variant="destructive">
            <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
              <span>
                {t(
                  "This room or its tables changed elsewhere. Your draft is still here. Reload the latest layout before editing further.",
                  "Просторот или масите се изменети на друго место. Нацртот е зачуван тука. Вчитајте го најновиот план пред да продолжите.",
                  "Dhoma ose tavolinat ndryshuan diku tjetër. Drafti juaj është ende këtu. Ringarkoni planin e fundit para se të vazhdoni.",
                )}
              </span>
              <Button variant="outline" onClick={() => request(onReset)}>
                {t("Reload latest", "Вчитај најново", "Ringarko të fundit")}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert>
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}
        <FloorPlanToolbar
          canUndo={cursor > 0}
          canRedo={cursor < history.length - 1}
          onUndo={undo}
          onRedo={redo}
          onAddTable={() => request(() => setResource({ kind: "table" }))}
          onAdd={(kind) => {
            if (
              draft.items.filter((item) => item.kind !== "table").length >= 200
            ) {
              setNotice(
                t(
                  "Each room supports up to 200 fixtures.",
                  "Секој простор поддржува до 200 објекти.",
                  "Çdo dhomë mbështet deri në 200 objekte.",
                ),
              );
              return;
            }
            const labels = {
              wall: t("Wall", "Ѕид", "Mur"),
              bar: t("Bar", "Шанк", "Banak"),
              door: t("Door", "Врата", "Derë"),
              plant: t("Plant", "Растение", "Bimë"),
              label: t("Entrance", "Влез", "Hyrje"),
            };
            const item = {
              ...createFloorFixture(
                kind,
                `fixture-${crypto.randomUUID()}`,
                draft,
              ),
              label: labels[kind],
            };
            commit({ ...draft, items: [...draft.items, item] });
            setSelected([item.id]);
            setTool("select");
          }}
          onArrange={() => {
            const next = arrangeFloorTables(draft);
            if (JSON.stringify(next) === JSON.stringify(draft))
              setNotice(
                t(
                  "No tables to arrange, or there is not enough free space. Unlock tables or adjust the room and fixtures.",
                  "Нема маси за распоредување или нема доволно простор. Отклучете маси или прилагодете го просторот и објектите.",
                  "Nuk ka tavolina për renditje ose hapësirë të mjaftueshme. Zhbllokoni tavolinat ose rregulloni dhomën dhe objektet.",
                ),
              );
            else {
              commit(next);
              setZoom(1);
              setFitKey(fitKey + 1);
            }
          }}
          tool={tool}
          onTool={setTool}
          grid={grid}
          onGrid={() => setGrid(!grid)}
          snap={snap}
          onSnap={() => setSnap(!snap)}
          zoom={zoom}
          onZoom={setZoom}
          onFit={() => {
            setZoom(1);
            setFitKey(fitKey + 1);
          }}
          disabled={disabled}
        />
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_264px]">
          <div className="flex min-w-0 flex-col gap-3">
            <FloorPlanCanvas
              key={`${baseline.version}:${stale ? "stale" : "current"}`}
              draft={visibleDraft}
              selected={selected}
              onSelect={setSelected}
              onCommit={commit}
              snap={snap}
              grid={grid}
              tool={tool}
              zoom={zoom}
              fitKey={fitKey}
              disabled={disabled}
              highlighted={highlighted}
              tables={tableMeta}
              onUndo={undo}
              onRedo={redo}
              onDelete={removeFixtures}
              onDuplicate={duplicateFixtures}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {snapshot.tables.length} {t("tables", "маси", "tavolina")} ·{" "}
                {snapshot.tables.reduce(
                  (sum, table) =>
                    sum +
                    (tableMeta.get(table._id)?.active ? table.capacity : 0),
                  0,
                )}{" "}
                {t("active seats", "активни места", "vende aktive")}
              </span>
              <span>
                {t(
                  "Shift-click to select several · Arrow keys to move · Shift for 10 units",
                  "Shift-клик за повеќе објекти · Стрелки за движење · Shift за 10 единици",
                  "Shift-klik për shumë objekte · Shigjetat për lëvizje · Shift për 10 njësi",
                )}
              </span>
            </div>
            {overlaps.length > 0 && (
              <Alert>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {t(
                      "Some tables overlap on the drawing. Arrange them or select a table below to move it.",
                      "Некои маси се преклопуваат на планот. Распоредете ги или изберете маса подолу за да ја поместите.",
                      "Disa tavolina mbivendosen në vizatim. Renditini ose zgjidhni një tavolinë më poshtë për ta lëvizur.",
                    )}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(overlaps[0])}
                  >
                    {t(
                      "Show overlap",
                      "Прикажи преклопување",
                      "Shfaq mbivendosjen",
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium">
                {t(
                  "Objects in this room",
                  "Објекти во просторот",
                  "Objektet në këtë dhomë",
                )}
              </h2>
              <div
                className="flex max-h-40 flex-wrap gap-2 overflow-y-auto"
                aria-label={t("Room objects", "Објекти", "Objektet e dhomës")}
              >
                {visibleDraft.items.map((item) => (
                  <Button
                    key={item.id}
                    size="sm"
                    variant={
                      selected.includes(item.id) ? "secondary" : "outline"
                    }
                    aria-pressed={selected.includes(item.id)}
                    onClick={(event) =>
                      setSelected(
                        event.shiftKey
                          ? selected.includes(item.id)
                            ? selected.filter((id) => id !== item.id)
                            : [...selected, item.id]
                          : [item.id],
                      )
                    }
                  >
                    {item.locked ? (
                      <LockKeyhole data-icon="inline-start" />
                    ) : item.kind === "table" ? (
                      <Layers data-icon="inline-start" />
                    ) : null}
                    <span className="max-w-44 truncate">{item.label}</span>
                  </Button>
                ))}
                {!draft.items.length && (
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "Add your first table or a room fixture to begin.",
                      "Додајте маса или објект за да започнете.",
                      "Shtoni tavolinën e parë ose një objekt për të filluar.",
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
          <FloorPlanInspector
            draft={draft}
            selectedItems={selection.map((item) =>
              item.kind === "table"
                ? { ...item, label: tableLabels.get(item.id) ?? item.label }
                : item,
            )}
            disabled={disabled}
            onChange={(items) =>
              commit({
                ...draft,
                items: draft.items.map((item) => {
                  const updated = items.find((row) => row.id === item.id);
                  return updated ? clampFloorItem(updated, draft) : item;
                }),
              })
            }
            onRoomChange={(width, height) => {
              if (
                draft.items.some((item) => {
                  const bounds = getFloorItemBounds(item);
                  return (
                    bounds.x < -1e-6 ||
                    bounds.y < -1e-6 ||
                    bounds.x + bounds.width > width + 1e-6 ||
                    bounds.y + bounds.height > height + 1e-6
                  );
                })
              ) {
                setNotice(
                  t(
                    "Move objects inside the new room size first. Nothing has been moved or resized.",
                    "Прво поместете ги објектите во новите димензии. Ништо не е изменето.",
                    "Së pari lëvizni objektet brenda madhësisë së re. Asgjë nuk u ndryshua.",
                  ),
                );
                return;
              }
              commit({ ...draft, width, height });
              setFitKey(fitKey + 1);
            }}
            onAlign={(alignment) =>
              commit(alignFloorItems(draft, selected, alignment))
            }
            onDistribute={(axis) =>
              commit(distributeFloorItems(draft, selected, axis))
            }
            onDelete={removeFixtures}
            onDuplicate={duplicateFixtures}
            onEditTable={(id) => {
              const row = workspace.tables.find((table) => table._id === id);
              if (row) request(() => setResource({ kind: "table", row }));
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "Layout units are for visual placement. Table capacity and booking combinations are managed separately. Fixtures never accept reservations.",
            "Единиците се за визуелен распоред. Капацитетот и комбинациите се уредуваат одделно. Објектите не примаат резервации.",
            "Njësitë shërbejnë për vendosje vizuale. Kapaciteti dhe kombinimet menaxhohen veçmas. Objektet nuk pranojnë rezervime.",
          )}
        </p>
      </div>
      {resource && (
        <ResourceEditor
          key={`${resource.kind}-${resource.row?._id ?? "new"}`}
          editor={resource}
          workspace={workspace}
          defaultAreaId={snapshot.area._id}
          onClose={() => setResource(null)}
          onSaved={(id) => {
            if (resource.kind === "area") onArea(id);
          }}
        />
      )}
      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !action.busy) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                "Save your layout first?",
                "Да се зачува планот?",
                "Ta ruani planin fillimisht?",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                "You have unsaved layout changes in this room. Save them, discard them, or keep editing.",
                "Имате незачувани промени во овој простор. Зачувајте ги, отфрлете ги или продолжете со уредување.",
                "Keni ndryshime të paruajtura në këtë dhomë. Ruajini, hidhini poshtë ose vazhdoni redaktimin.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={action.busy}>
              {t("Keep editing", "Продолжи со уредување", "Vazhdo redaktimin")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="outline"
              disabled={action.busy}
              onClick={() => {
                const next = pending;
                clearRecovery();
                setHistory([baseline.draft]);
                setCursor(0);
                setPending(null);
                next?.();
              }}
            >
              {t("Discard changes", "Отфрли промени", "Hidh ndryshimet")}
            </AlertDialogAction>
            {!stale && (
              <Button
                disabled={action.busy}
                onClick={async () => {
                  const next = pending;
                  if (await persist()) {
                    setPending(null);
                    next?.();
                  }
                }}
              >
                {action.busy && <Spinner data-icon="inline-start" />}
                {t(
                  "Save and continue",
                  "Зачувај и продолжи",
                  "Ruaj dhe vazhdo",
                )}
              </Button>
            )}
          </AlertDialogFooter>
          {action.error && <ReservationError error={action.error} />}
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
