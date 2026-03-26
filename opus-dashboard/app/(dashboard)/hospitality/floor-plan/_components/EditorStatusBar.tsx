"use client";

import { EditorAction } from "./types";
import { cn } from "@/lib/utils";
import { IconMinus, IconPlus } from "@tabler/icons-react";

interface EditorStatusBarProps {
  tableCount: number;
  totalSeats: number;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  gridSize: 10 | 20 | 40;
  zoom: number;
  dispatch: React.Dispatch<EditorAction>;
  onSave: () => void;
}

export default function EditorStatusBar({
  tableCount,
  totalSeats,
  hasUnsavedChanges,
  isSaving,
  gridSize,
  zoom,
  dispatch,
  onSave,
}: EditorStatusBarProps) {
  const gridOptions: (10 | 20 | 40)[] = [10, 20, 40];

  return (
    <div className="h-10 bg-card border-t border-border flex items-center px-4 shrink-0 gap-4">
      {/* Left: Table info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{tableCount}</span> tables
        <span className="text-border">·</span>
        <span className="font-medium text-foreground">{totalSeats}</span> seats total
        {hasUnsavedChanges && (
          <>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
            </span>
          </>
        )}
      </div>

      {/* Centre: Grid size */}
      <div className="flex-1 flex items-center justify-center gap-1">
        <span className="text-xs text-muted-foreground mr-1.5">Grid:</span>
        {gridOptions.map((size) => (
          <button
            key={size}
            onClick={() => dispatch({ type: "SET_GRID_SIZE", size })}
            className={cn(
              "h-6 px-2 rounded text-xs font-medium transition-all",
              gridSize === size
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80",
            )}
          >
            {size}px
          </button>
        ))}
      </div>

      {/* Right: Zoom + Save */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: zoom / 1.15 })}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary"
        >
          <IconMinus className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs font-mono text-muted-foreground w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: zoom * 1.15 })}
          className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:bg-secondary"
        >
          <IconPlus className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          className={cn(
            "h-8 px-4 rounded-full text-xs font-semibold transition-all",
            hasUnsavedChanges && !isSaving
              ? "bg-accent text-accent-foreground hover:opacity-90 shadow-sm"
              : "bg-secondary text-muted-foreground cursor-not-allowed",
          )}
        >
          {isSaving ? "Saving…" : "Save floor plan"}
        </button>
      </div>
    </div>
  );
}
