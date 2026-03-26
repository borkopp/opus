import { Id } from "@/convex/_generated/dataModel";

// ─────────────────────────────────────────────────────────────────────────────
// Editor Types
// ─────────────────────────────────────────────────────────────────────────────

export type TableShapeType = "rectangle" | "circle" | "booth";

export type EditorMode = "select" | "multiselect" | "add_rectangle" | "add_circle" | "add_booth";

export interface LocalTable {
  id: string; // temp ID for new tables, or Convex _id string for existing
  convexId?: Id<"tables">; // real Convex ID if saved
  floorPlanId: Id<"floor_plans">;
  label: string;
  capacity: number;
  minCapacity?: number;
  shape: TableShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  status: "available" | "reserved" | "occupied" | "cleaning" | "inactive";
  sortOrder: number;
  isDirty: boolean;
  isNew: boolean; // true if created this session, not yet in Convex
  isDeleted: boolean; // locally marked for deletion on save
}

export interface EditorState {
  tables: LocalTable[];
  selectedIds: string[];
  mode: EditorMode;
  isDragging: boolean;
  zoom: number;
  panOffset: { x: number; y: number };
  gridSize: 10 | 20 | 40;
  undoStack: LocalTable[][];
  hasUnsavedChanges: boolean;
  isSaving: boolean;
}

export type EditorAction =
  | { type: "LOAD_TABLES"; tables: LocalTable[] }
  | { type: "ADD_TABLE"; table: LocalTable }
  | { type: "UPDATE_TABLE"; id: string; updates: Partial<LocalTable> }
  | { type: "DELETE_TABLES"; ids: string[] }
  | { type: "SELECT_TABLE"; id: string; addToSelection?: boolean }
  | { type: "SELECT_TABLES"; ids: string[] }
  | { type: "DESELECT_ALL" }
  | { type: "SET_MODE"; mode: EditorMode }
  | { type: "MOVE_TABLE"; id: string; x: number; y: number }
  | { type: "BATCH_MOVE"; moves: Array<{ id: string; x: number; y: number }> }
  | { type: "RESIZE_TABLE"; id: string; width: number; height: number }
  | { type: "ROTATE_TABLE"; id: string; rotation: number }
  | { type: "SET_ZOOM"; zoom: number }
  | { type: "SET_PAN"; offset: { x: number; y: number } }
  | { type: "SET_GRID_SIZE"; size: 10 | 20 | 40 }
  | { type: "SET_DRAGGING"; isDragging: boolean }
  | { type: "UNDO" }
  | { type: "DUPLICATE_SELECTED" }
  | { type: "SET_SAVING"; isSaving: boolean }
  | { type: "MARK_SAVED"; idMap?: Map<string, string> }
  | { type: "PUSH_UNDO" };

// Default dimensions for new tables
export const TABLE_DEFAULTS: Record<TableShapeType, { width: number; height: number }> = {
  rectangle: { width: 80, height: 60 },
  circle: { width: 120, height: 120 },
  booth: { width: 100, height: 50 },
};

export const INITIAL_EDITOR_STATE: EditorState = {
  tables: [],
  selectedIds: [],
  mode: "select",
  isDragging: false,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  gridSize: 20,
  undoStack: [],
  hasUnsavedChanges: false,
  isSaving: false,
};
