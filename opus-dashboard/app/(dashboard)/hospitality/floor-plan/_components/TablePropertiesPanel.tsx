"use client";

import { LocalTable, EditorAction, TableShapeType } from "./types";
import { cn } from "@/lib/utils";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";

interface TablePropertiesPanelProps {
  tables: LocalTable[];
  selectedIds: string[];
  dispatch: React.Dispatch<EditorAction>;
}

export default function TablePropertiesPanel({
  tables,
  selectedIds,
  dispatch,
}: TablePropertiesPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const selectedTables = tables.filter(
    (t) => selectedIds.includes(t.id) && !t.isDeleted,
  );

  if (selectedTables.length === 0) return null;

  // Multi-select summary
  if (selectedTables.length > 1) {
    const totalCapacity = selectedTables.reduce((sum, t) => sum + t.capacity, 0);
    return (
      <div className="w-[260px] bg-card border-l border-border p-4 shrink-0 flex flex-col gap-3 overflow-y-auto">
        <h3 className="text-sm font-semibold text-foreground">
          {selectedTables.length} tables selected
        </h3>
        <p className="text-xs text-muted-foreground">{totalCapacity} total seats</p>
        <div className="h-px bg-border" />
        <button
          onClick={() => {
            if (confirmDelete) {
              dispatch({ type: "PUSH_UNDO" });
              dispatch({ type: "DELETE_TABLES", ids: selectedIds });
              setConfirmDelete(false);
            } else {
              setConfirmDelete(true);
            }
          }}
          className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors py-1.5"
        >
          <IconTrash className="h-4 w-4" />
          {confirmDelete ? "Click again to confirm" : "Delete all selected"}
        </button>
      </div>
    );
  }

  // Single table editing
  const table = selectedTables[0];

  const updateField = (updates: Partial<LocalTable>) => {
    dispatch({ type: "UPDATE_TABLE", id: table.id, updates });
  };

  const shapes: TableShapeType[] = ["rectangle", "circle", "booth"];

  return (
    <div className="w-[260px] bg-card border-l border-border p-4 shrink-0 flex flex-col gap-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-foreground">Table Properties</h3>

      {/* Label */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Label</span>
        <input
          type="text"
          value={table.label}
          onChange={(e) => updateField({ label: e.target.value })}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      {/* Capacity */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Capacity</span>
        <input
          type="number"
          min={1}
          max={50}
          value={table.capacity}
          onChange={(e) => updateField({ capacity: Math.max(1, parseInt(e.target.value) || 1) })}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      {/* Min Capacity */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Min capacity</span>
        <input
          type="number"
          min={0}
          max={table.capacity}
          value={table.minCapacity ?? ""}
          placeholder="No minimum"
          onChange={(e) => {
            const val = parseInt(e.target.value);
            updateField({ minCapacity: isNaN(val) ? undefined : Math.max(0, val) });
          }}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      {/* Shape selector */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Shape</span>
        <div className="flex gap-1">
          {shapes.map((s) => (
            <button
              key={s}
              onClick={() => updateField({ shape: s })}
              className={cn(
                "flex-1 h-8 rounded-md text-xs font-medium transition-all capitalize",
                table.shape === s
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div className="flex gap-2">
        <label className="flex flex-col gap-1.5 flex-1">
          <span className="text-xs font-medium text-muted-foreground">Width</span>
          <input
            type="number"
            min={40}
            value={table.width}
            onChange={(e) => updateField({ width: Math.max(40, parseInt(e.target.value) || 40) })}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        {table.shape !== "circle" && (
          <label className="flex flex-col gap-1.5 flex-1">
            <span className="text-xs font-medium text-muted-foreground">Height</span>
            <input
              type="number"
              min={40}
              value={table.height}
              onChange={(e) => updateField({ height: Math.max(40, parseInt(e.target.value) || 40) })}
              className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
        )}
      </div>

      {/* Rotation */}
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Rotation</span>
        <input
          type="number"
          min={0}
          max={360}
          value={table.rotation}
          onChange={(e) => updateField({ rotation: parseInt(e.target.value) || 0 })}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </label>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Delete button */}
      <div className="border-t border-border pt-3 mt-2">
        <button
          onClick={() => {
            dispatch({ type: "PUSH_UNDO" });
            dispatch({ type: "DELETE_TABLES", ids: [table.id] });
          }}
          className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
        >
          <IconTrash className="h-4 w-4" />
          Delete table
        </button>
      </div>

      {/* Debug ID */}
      {table.convexId && (
        <p className="text-[10px] text-muted-foreground/50 font-mono truncate">
          {table.convexId}
        </p>
      )}
    </div>
  );
}
