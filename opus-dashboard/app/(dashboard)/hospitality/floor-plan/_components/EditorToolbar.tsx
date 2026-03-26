"use client";

import { EditorAction, EditorMode } from "./types";
import {
  IconPointer,
  IconMarquee,
  IconSquare,
  IconCircle,
  IconRectangle,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  mode: EditorMode;
  selectedCount: number;
  zoom: number;
  dispatch: React.Dispatch<EditorAction>;
}

function ToolButton({
  icon,
  label,
  active,
  danger,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-150",
        active && "bg-accent text-accent-foreground shadow-sm",
        danger && !disabled && "text-destructive hover:bg-destructive/10",
        !active && !danger && "text-muted-foreground hover:bg-secondary hover:text-foreground",
        disabled && "opacity-30 cursor-not-allowed",
      )}
    >
      {icon}
    </button>
  );
}

export default function EditorToolbar({ mode, selectedCount, zoom, dispatch }: EditorToolbarProps) {
  return (
    <div className="flex flex-col items-center w-14 bg-card border-r border-border py-3 gap-1 shrink-0">
      {/* Add table shapes */}
      <ToolButton
        icon={<IconSquare className="h-5 w-5" />}
        label="Add rectangle table"
        active={mode === "add_rectangle"}
        onClick={() => dispatch({ type: "SET_MODE", mode: "add_rectangle" })}
      />
      <ToolButton
        icon={<IconCircle className="h-5 w-5" />}
        label="Add circle table"
        active={mode === "add_circle"}
        onClick={() => dispatch({ type: "SET_MODE", mode: "add_circle" })}
      />
      <ToolButton
        icon={<IconRectangle className="h-5 w-5" />}
        label="Add booth"
        active={mode === "add_booth"}
        onClick={() => dispatch({ type: "SET_MODE", mode: "add_booth" })}
      />

      {/* Divider */}
      <div className="w-8 h-px bg-border my-1" />

      {/* Selection modes */}
      <ToolButton
        icon={<IconPointer className="h-5 w-5" />}
        label="Select (V)"
        active={mode === "select"}
        onClick={() => dispatch({ type: "SET_MODE", mode: "select" })}
      />
      <ToolButton
        icon={<IconMarquee className="h-5 w-5" />}
        label="Multi-select"
        active={mode === "multiselect"}
        onClick={() => dispatch({ type: "SET_MODE", mode: "multiselect" })}
      />

      {/* Divider */}
      <div className="w-8 h-px bg-border my-1" />

      {/* Delete */}
      <ToolButton
        icon={<IconTrash className="h-5 w-5" />}
        label="Delete selected"
        danger
        disabled={selectedCount === 0}
        onClick={() => {
          dispatch({ type: "PUSH_UNDO" });
          // The actual IDs are handled by the parent who knows selectedIds
          dispatch({ type: "DELETE_TABLES", ids: [] });
        }}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom controls */}
      <ToolButton
        icon={<IconZoomIn className="h-5 w-5" />}
        label="Zoom in"
        onClick={() => dispatch({ type: "SET_ZOOM", zoom: zoom * 1.15 })}
      />
      <ToolButton
        icon={<IconZoomOut className="h-5 w-5" />}
        label="Zoom out"
        onClick={() => dispatch({ type: "SET_ZOOM", zoom: zoom / 1.15 })}
      />
      <ToolButton
        icon={<IconZoomReset className="h-5 w-5" />}
        label="Reset zoom"
        onClick={() => {
          dispatch({ type: "SET_ZOOM", zoom: 1 });
          dispatch({ type: "SET_PAN", offset: { x: 0, y: 0 } });
        }}
      />
    </div>
  );
}
