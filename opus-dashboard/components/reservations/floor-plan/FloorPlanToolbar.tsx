"use client";

import {
  ArrowDownToLine,
  Armchair,
  BrickWall,
  DoorOpen,
  Grid2X2,
  Hand,
  Leaf,
  Magnet,
  Maximize,
  MousePointer2,
  Plus,
  Redo2,
  Type,
  Undo2,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from "lucide-react";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FloorItem } from "@/lib/floor-plan";

export function FloorToolButton({
  label,
  icon: Icon,
  ...props
}: React.ComponentProps<typeof Button> & { label: string; icon: LucideIcon }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          {...props}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function FloorPlanToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAdd,
  onAddTable,
  onArrange,
  tool,
  onTool,
  grid,
  onGrid,
  snap,
  onSnap,
  zoom,
  onZoom,
  onFit,
  disabled,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAdd: (kind: Exclude<FloorItem["kind"], "table">) => void;
  onAddTable: () => void;
  onArrange: () => void;
  tool: "select" | "pan";
  onTool: (value: "select" | "pan") => void;
  grid: boolean;
  onGrid: () => void;
  snap: boolean;
  onSnap: () => void;
  zoom: number;
  onZoom: (value: number) => void;
  onFit: () => void;
  disabled: boolean;
}) {
  const { t } = useDashboardI18n();
  const fixtures = [
    { kind: "wall" as const, label: t("Wall", "Ѕид", "Mur"), icon: BrickWall },
    {
      kind: "bar" as const,
      label: t("Bar / counter", "Шанк / пулт", "Banak"),
      icon: Armchair,
    },
    {
      kind: "door" as const,
      label: t("Door", "Врата", "Derë"),
      icon: DoorOpen,
    },
    {
      kind: "plant" as const,
      label: t("Plant", "Растение", "Bimë"),
      icon: Leaf,
    },
    {
      kind: "label" as const,
      label: t("Text label", "Текст", "Etiketë teksti"),
      icon: Type,
    },
  ];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-2">
      <div className="flex flex-wrap items-center gap-1">
        <FloorToolButton
          icon={Undo2}
          label={t("Undo (⌘/Ctrl Z)", "Врати (⌘/Ctrl Z)", "Zhbëj (⌘/Ctrl Z)")}
          onClick={onUndo}
          disabled={disabled || !canUndo}
        />
        <FloorToolButton
          icon={Redo2}
          label={t(
            "Redo (⌘/Ctrl Shift Z)",
            "Повтори (⌘/Ctrl Shift Z)",
            "Ribëj (⌘/Ctrl Shift Z)",
          )}
          onClick={onRedo}
          disabled={disabled || !canRedo}
        />
        <ToggleGroup
          type="single"
          variant="outline"
          value={tool}
          onValueChange={(value) => value && onTool(value as "select" | "pan")}
          aria-label={t("Canvas tool", "Алатка", "Mjet i kanavacës")}
          disabled={disabled}
        >
          <ToggleGroupItem
            value="select"
            aria-label={t(
              "Select and move",
              "Избери и помести",
              "Zgjidh dhe lëviz",
            )}
          >
            <MousePointer2 />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="pan"
            aria-label={t("Pan canvas", "Помести платно", "Lëviz kanavacën")}
          >
            <Hand />
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddTable}
          disabled={disabled}
        >
          <Plus data-icon="inline-start" />
          {t("Table", "Маса", "Tavolinë")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled}>
              <Plus data-icon="inline-start" />
              {t("Fixture", "Објект", "Objekt")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              {fixtures.map(({ kind, label, icon: Icon }) => (
                <DropdownMenuItem key={kind} onSelect={() => onAdd(kind)}>
                  <Icon />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          onClick={onArrange}
          disabled={disabled}
        >
          <ArrowDownToLine data-icon="inline-start" />
          {t("Arrange tables", "Распореди маси", "Rendit tavolinat")}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <FloorToolButton
          icon={Grid2X2}
          label={t("Show grid", "Прикажи мрежа", "Shfaq rrjetën")}
          aria-pressed={grid}
          variant={grid ? "secondary" : "ghost"}
          onClick={onGrid}
        />
        <FloorToolButton
          icon={Magnet}
          label={t("Snap to grid", "Порамни со мрежа", "Kap te rrjeta")}
          aria-pressed={snap}
          variant={snap ? "secondary" : "ghost"}
          onClick={onSnap}
        />
        <FloorToolButton
          icon={ZoomOut}
          label={t("Zoom out", "Оддалечи", "Zvogëlo")}
          disabled={zoom <= 0.5}
          onClick={() => onZoom(Math.max(0.5, zoom - 0.25))}
        />
        <span
          className="w-11 text-center text-xs tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {Math.round(zoom * 100)}%
        </span>
        <FloorToolButton
          icon={ZoomIn}
          label={t("Zoom in", "Приближи", "Zmadho")}
          disabled={zoom >= 3}
          onClick={() => onZoom(Math.min(3, zoom + 0.25))}
        />
        <FloorToolButton
          icon={Maximize}
          label={t("Fit room", "Прикажи цел простор", "Përshtat dhomën")}
          onClick={onFit}
        />
      </div>
    </div>
  );
}
