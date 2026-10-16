"use client";

import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { cn } from "@/lib/utils";
import {
  clampFloorItem,
  getFloorItemBounds,
  moveFloorItems,
  resizeFloorItemFromCorner,
  type FloorItem,
  type FloorPlanDraft,
} from "@/lib/floor-plan";

type Point = { x: number; y: number };
type Gesture = {
  pointerId: number;
  start: Point;
  client: Point;
  draft: FloorPlanDraft;
  mode: "move" | "resize" | "rotate" | "pan" | "select";
  ids: string[];
  item?: FloorItem;
  pan: Point;
  additive: boolean;
};

export function FloorPlanCanvas({
  draft,
  selected,
  onSelect,
  onCommit,
  snap,
  grid,
  tool,
  zoom,
  fitKey,
  disabled,
  highlighted,
  tables,
  onUndo,
  onRedo,
  onDelete,
  onDuplicate,
  service,
}: {
  draft: FloorPlanDraft;
  selected: string[];
  onSelect: (ids: string[]) => void;
  onCommit: (draft: FloorPlanDraft) => void;
  snap: boolean;
  grid: boolean;
  tool: "select" | "pan";
  zoom: number;
  fitKey: number;
  disabled: boolean;
  highlighted: string[];
  tables: Map<string, { capacity: number; active: boolean }>;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  /** Selection-only service view. Geometry and keyboard edits are disabled. */
  service?: Map<
    string,
    { label: string; detail: string; className: string; attention: boolean }
  >;
}) {
  const { t } = useDashboardI18n();
  const svg = useRef<SVGSVGElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const previewRef = useRef<FloorPlanDraft | null>(null);
  const [preview, setPreview] = useState<FloorPlanDraft | null>(null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 800, height: 540 });
  const [marquee, setMarquee] = useState<{ start: Point; end: Point } | null>(
    null,
  );
  const gridId = useId().replaceAll(":", "");
  const plan = preview ?? draft;
  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      }),
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  const [lastFit, setLastFit] = useState(fitKey);
  if (lastFit !== fitKey) {
    setLastFit(fitKey);
    setPan({ x: 0, y: 0 });
  }
  const ratio = Math.max(0.1, size.width / Math.max(1, size.height));
  const viewWidth =
    Math.max(draft.width + 100, (draft.height + 100) * ratio) / zoom;
  const viewHeight = viewWidth / ratio;
  const viewX = (draft.width - viewWidth) / 2 + pan.x;
  const viewY = (draft.height - viewHeight) / 2 + pan.y;
  const unit = viewWidth / Math.max(size.width, 1);
  function point(event: PointerEvent<SVGElement>): Point {
    const matrix = svg.current?.getScreenCTM()?.inverse();
    if (!matrix) return { x: 0, y: 0 };
    return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix);
  }
  function start(
    event: PointerEvent<SVGElement>,
    item?: FloorItem,
    mode?: "resize" | "rotate",
  ) {
    if (disabled || gesture.current || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    svg.current?.focus({ preventScroll: true });
    if (service && tool !== "pan") {
      // Fixtures are scenery during service. Selecting a table never starts a drag.
      onSelect(item?.kind === "table" ? [item.id] : []);
      return;
    }
    let ids = selected;
    if (item && tool !== "pan") {
      ids = event.shiftKey
        ? selected.includes(item.id)
          ? selected.filter((id) => id !== item.id)
          : [...selected, item.id]
        : selected.includes(item.id)
          ? selected
          : [item.id];
      onSelect(ids);
    }
    const modeValue =
      tool === "pan" ? "pan" : (mode ?? (item ? "move" : "select"));
    gesture.current = {
      pointerId: event.pointerId,
      start: point(event),
      client: { x: event.clientX, y: event.clientY },
      draft,
      mode: modeValue,
      ids,
      item,
      pan,
      additive: event.shiftKey,
    };
    svg.current?.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const active = gesture.current;
    if (disabled || !active || active.pointerId !== event.pointerId) return;
    const here = point(event);
    const dx = here.x - active.start.x;
    const dy = here.y - active.start.y;
    if (active.mode === "pan") {
      setPan({
        x: active.pan.x - (event.clientX - active.client.x) * unit,
        y: active.pan.y - (event.clientY - active.client.y) * unit,
      });
      return;
    }
    if (active.mode === "select") {
      setMarquee({ start: active.start, end: here });
      return;
    }
    let next = active.draft;
    if (active.mode === "move")
      next = moveFloorItems(active.draft, active.ids, dx, dy, { snap });
    if (active.item && !active.item.locked && active.mode === "resize") {
      const item = resizeFloorItemFromCorner(
        active.item,
        { x: dx, y: dy },
        active.draft,
        { snap },
      );
      next = {
        ...active.draft,
        items: active.draft.items.map((row) =>
          row.id === item.id ? item : row,
        ),
      };
    }
    if (active.item && !active.item.locked && active.mode === "rotate") {
      const item = active.item;
      const cx = item.x + item.width / 2,
        cy = item.y + item.height / 2;
      const a = Math.atan2(active.start.y - cy, active.start.x - cx);
      const b = Math.atan2(here.y - cy, here.x - cx);
      let rotation =
        (((item.rotation + ((b - a) * 180) / Math.PI) % 360) + 360) % 360;
      rotation = snap
        ? (Math.round(rotation / 15) * 15) % 360
        : Math.round(rotation) % 360;
      const updated = clampFloorItem({ ...item, rotation }, draft);
      next = {
        ...active.draft,
        items: active.draft.items.map((row) =>
          row.id === item.id ? updated : row,
        ),
      };
    }
    previewRef.current = next;
    setPreview(next);
  }
  function end(event: PointerEvent<SVGSVGElement>, cancelled = false) {
    const active = gesture.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (!cancelled && !disabled) {
      if (active.mode === "select") {
        const here = point(event);
        const box = {
          x: Math.min(here.x, active.start.x),
          y: Math.min(here.y, active.start.y),
          width: Math.abs(here.x - active.start.x),
          height: Math.abs(here.y - active.start.y),
        };
        const ids =
          box.width < 3 && box.height < 3
            ? []
            : draft.items
                .filter((item) => {
                  const bounds = getFloorItemBounds(item);
                  return (
                    bounds.x >= box.x &&
                    bounds.y >= box.y &&
                    bounds.x + bounds.width <= box.x + box.width &&
                    bounds.y + bounds.height <= box.y + box.height
                  );
                })
                .map((item) => item.id);
        onSelect(active.additive ? [...new Set([...active.ids, ...ids])] : ids);
      } else if (previewRef.current) onCommit(previewRef.current);
    }
    gesture.current = null;
    previewRef.current = null;
    setPreview(null);
    setMarquee(null);
    if (svg.current?.hasPointerCapture(event.pointerId))
      svg.current.releasePointerCapture(event.pointerId);
  }
  return (
    <div
      ref={host}
      className="relative h-[320px] sm:h-[440px] min-w-0 overflow-hidden rounded-lg border bg-muted/30 lg:h-[600px]"
    >
      <svg
        ref={svg}
        role="group"
        aria-label={t(
          "Floor plan canvas",
          "Платно на планот",
          "Kanavaca e planit",
        )}
        tabIndex={0}
        className={cn(
          "size-full touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          tool === "pan"
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default",
        )}
        viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
        onPointerDown={(event) => start(event)}
        onPointerMove={move}
        onPointerUp={(event) => end(event)}
        onPointerCancel={(event) => end(event, true)}
        onKeyDown={(event) => {
          if (disabled || gesture.current) return;
          if (service) {
            if (event.key === "Escape") {
              event.preventDefault();
              onSelect([]);
            }
            return;
          }
          const modifier = event.metaKey || event.ctrlKey;
          if (modifier && event.key.toLowerCase() === "z") {
            event.preventDefault();
            if (event.shiftKey) onRedo();
            else onUndo();
            return;
          }
          if (modifier && event.key.toLowerCase() === "a") {
            event.preventDefault();
            onSelect(draft.items.map((item) => item.id));
            return;
          }
          if (modifier && event.key.toLowerCase() === "d") {
            event.preventDefault();
            onDuplicate();
            return;
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onSelect([]);
            return;
          }
          if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            onDelete();
            return;
          }
          const delta = event.shiftKey ? 10 : 1;
          const moves: Record<string, [number, number]> = {
            ArrowLeft: [-delta, 0],
            ArrowRight: [delta, 0],
            ArrowUp: [0, -delta],
            ArrowDown: [0, delta],
          };
          if (moves[event.key]) {
            event.preventDefault();
            onCommit(
              moveFloorItems(draft, selected, ...moves[event.key], {
                snap: false,
              }),
            );
          }
        }}
      >
        <title>
          {service
            ? t(
                "Select a table to seat walk-ins and manage visits. Use the table list as an alternative.",
                "Изберете маса за гости без резервација и управување со посети. Може да ја користите и листата на маси.",
                "Zgjidhni një tavolinë për të ulur mysafirët pa rezervim dhe menaxhuar vizitat. Mund të përdorni edhe listën e tavolinave.",
              )
            : t(
                "Drag tables to match your venue. Use the item list and position fields as an alternative.",
                "Повлечете ги масите според просторот. Може да ги користите и листата и полињата за позиција.",
                "Tërhiqni tavolinat sipas lokalit. Mund të përdorni edhe listën dhe fushat e pozicionit.",
              )}
        </title>
        <defs>
          <pattern
            id={gridId}
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="0" cy="0" r="1" className="fill-muted-foreground/25" />
          </pattern>
        </defs>
        <rect
          width={plan.width}
          height={plan.height}
          rx="4"
          className="fill-card stroke-border"
          strokeWidth={2 * unit}
        />
        {grid && (
          <rect
            width={plan.width}
            height={plan.height}
            fill={`url(#${gridId})`}
            pointerEvents="none"
          />
        )}
        {[
          ...plan.items.filter((item) => item.kind !== "table"),
          ...plan.items
            .filter((item) => item.kind === "table")
            .sort(
              (a, b) =>
                Number(selected.includes(a.id)) -
                Number(selected.includes(b.id)),
            ),
        ].map((item) => {
          const isSelected = selected.includes(item.id);
          const meta = tables.get(item.id);
          const state = service?.get(item.id);
          const radius =
            item.shape === "circle" || item.kind === "plant"
              ? Math.min(item.width, item.height) / 2
              : item.shape === "booth"
                ? 14
                : 8;
          const table = item.kind === "table";
          const showSeats = table && item.height / unit >= 44;
          const labelSize = Math.max(14, 10 * unit);
          const maxLetters = Math.max(
            2,
            Math.min(18, Math.floor((item.width - 12) / (labelSize * 0.6))),
          );
          return (
            <g
              key={item.id}
              data-testid={`floor-item-${item.id}`}
              role={!service || table ? "button" : undefined}
              tabIndex={!service || table ? 0 : undefined}
              aria-label={`${item.label}${table ? ` · ${meta?.capacity ?? ""} ${t("seats", "места", "vende")}` : ""}${state ? ` · ${state.label} · ${state.detail}` : ""}${item.locked && !service ? ` · ${t("locked", "заклучено", "i kyçur")}` : ""}`}
              aria-pressed={isSelected}
              aria-disabled={disabled}
              className={cn(
                "outline-none focus-visible:[&>rect:last-child]:stroke-ring",
                table && meta?.active === false && !service && "opacity-50",
                service && table && "cursor-pointer",
              )}
              transform={`translate(${item.x} ${item.y}) rotate(${item.rotation} ${item.width / 2} ${item.height / 2})`}
              onPointerDown={(event) => start(event, item)}
              onKeyDown={(event) => {
                if (disabled || (service && !table)) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelect(
                    event.shiftKey && !service
                      ? [...new Set([...selected, item.id])]
                      : [item.id],
                  );
                }
              }}
            >
              {highlighted.includes(item.id) && (
                <rect
                  x={-8}
                  y={-8}
                  width={item.width + 16}
                  height={item.height + 16}
                  rx={radius + 8}
                  className="fill-primary/10 stroke-primary"
                  strokeDasharray="5 4"
                  strokeWidth={unit}
                />
              )}
              {table && item.shape === "circle" ? (
                <ellipse
                  cx={item.width / 2}
                  cy={item.height / 2}
                  rx={item.width / 2}
                  ry={item.height / 2}
                  className={cn(
                    state?.className ?? "fill-background stroke-foreground/45",
                    isSelected && "stroke-primary",
                  )}
                  strokeWidth={(isSelected ? 2 : 1.5) * unit}
                />
              ) : (
                <rect
                  width={item.width}
                  height={item.height}
                  rx={radius}
                  className={cn(
                    table
                      ? (state?.className ??
                          "fill-background stroke-foreground/45")
                      : item.kind === "wall"
                        ? "fill-muted-foreground stroke-muted-foreground"
                        : "fill-muted stroke-border",
                    isSelected && "stroke-primary",
                  )}
                  strokeWidth={(isSelected ? 2 : 1.5) * unit}
                />
              )}
              {table && item.shape === "booth" && (
                <path
                  d={`M 8 ${item.height - 10} V 12 Q 8 8 14 8 H ${item.width - 14} Q ${item.width - 8} 8 ${item.width - 8} 12 V ${item.height - 10}`}
                  fill="none"
                  className="stroke-muted-foreground/40"
                  strokeWidth="9"
                />
              )}
              {item.kind === "door" && (
                <path
                  d={`M 5 ${item.height - 5} L 5 5 M 5 ${item.height - 5} A ${item.width - 10} ${item.height - 10} 0 0 0 ${item.width - 5} 5`}
                  fill="none"
                  className="stroke-muted-foreground"
                  strokeDasharray="4 3"
                  strokeWidth="2"
                />
              )}
              {item.kind === "plant" && (
                <g className="fill-foreground/20">
                  <ellipse
                    cx={item.width * 0.4}
                    cy={item.height * 0.4}
                    rx={item.width * 0.2}
                    ry={item.height * 0.3}
                    transform={`rotate(-35 ${item.width / 2} ${item.height / 2})`}
                  />
                  <ellipse
                    cx={item.width * 0.6}
                    cy={item.height * 0.5}
                    rx={item.width * 0.2}
                    ry={item.height * 0.3}
                    transform={`rotate(35 ${item.width / 2} ${item.height / 2})`}
                  />
                </g>
              )}
              {item.kind !== "wall" && item.kind !== "plant" && (
                <g
                  transform={`rotate(${-item.rotation} ${item.width / 2} ${item.height / 2})`}
                  pointerEvents="none"
                >
                  <text
                    x={item.width / 2}
                    y={item.height / 2 + (showSeats ? -3 : 4) * unit}
                    textAnchor="middle"
                    className="fill-foreground"
                    fontSize={labelSize}
                    fontWeight={table ? 600 : 400}
                  >
                    {item.label.length > maxLetters
                      ? `${item.label.slice(0, maxLetters - 1)}…`
                      : item.label}
                  </text>
                  {showSeats && (
                    <text
                      x={item.width / 2}
                      y={item.height / 2 + 17 * unit}
                      textAnchor="middle"
                      className="fill-muted-foreground"
                      fontSize={Math.max(11, 10 * unit)}
                    >
                      {state
                        ? state.label
                        : `${meta?.capacity ?? "—"} ${t("seats", "места", "vende")}`}
                    </text>
                  )}
                </g>
              )}
              {state?.attention && (
                <g
                  pointerEvents="none"
                  transform={`translate(${item.width - 7 * unit} ${7 * unit})`}
                >
                  <circle r={8 * unit} className="fill-danger" />
                  <text
                    textAnchor="middle"
                    y={4 * unit}
                    fontSize={12 * unit}
                    fontWeight={700}
                    className="fill-white"
                  >
                    !
                  </text>
                </g>
              )}
              {item.locked && !service && (
                <g pointerEvents="none">
                  <rect
                    x={item.width - 15}
                    y="5"
                    width="9"
                    height="7"
                    rx="2"
                    className="fill-muted-foreground"
                  />
                  <path
                    d={`M ${item.width - 13} 5 V 3 a 2.5 2.5 0 0 1 5 0 V 5`}
                    fill="none"
                    className="stroke-muted-foreground"
                  />
                </g>
              )}
              <rect
                x={-3 * unit}
                y={-3 * unit}
                width={item.width + 6 * unit}
                height={item.height + 6 * unit}
                rx={radius}
                fill="none"
                className={isSelected ? "stroke-primary" : "stroke-transparent"}
                strokeWidth={unit}
                pointerEvents="none"
              />
              {isSelected &&
                selected.length === 1 &&
                !item.locked &&
                !disabled &&
                !service && (
                  <>
                    <line
                      x1={item.width / 2}
                      y1={0}
                      x2={item.width / 2}
                      y2={-24 * unit}
                      className="stroke-primary"
                      strokeWidth={unit}
                    />
                    <circle
                      role="button"
                      aria-label={t(
                        "Rotate selected item",
                        "Ротирај избран објект",
                        "Rrotullo objektin e zgjedhur",
                      )}
                      cx={item.width / 2}
                      cy={-24 * unit}
                      r={8 * unit}
                      className="fill-background stroke-primary cursor-grab"
                      strokeWidth={2 * unit}
                      onPointerDown={(event) => start(event, item, "rotate")}
                    />
                    <rect
                      role="button"
                      aria-label={t(
                        "Resize selected item",
                        "Промени големина на избраниот објект",
                        "Ndrysho madhësinë e objektit",
                      )}
                      x={item.width - 7 * unit}
                      y={item.height - 7 * unit}
                      width={14 * unit}
                      height={14 * unit}
                      rx={3 * unit}
                      className="fill-background stroke-primary cursor-nwse-resize"
                      strokeWidth={2 * unit}
                      onPointerDown={(event) => start(event, item, "resize")}
                    />
                  </>
                )}
            </g>
          );
        })}
        {marquee && (
          <rect
            x={Math.min(marquee.start.x, marquee.end.x)}
            y={Math.min(marquee.start.y, marquee.end.y)}
            width={Math.abs(marquee.end.x - marquee.start.x)}
            height={Math.abs(marquee.end.y - marquee.start.y)}
            className="fill-primary/10 stroke-primary"
            strokeWidth={unit}
            pointerEvents="none"
          />
        )}
      </svg>
    </div>
  );
}
