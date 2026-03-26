import { EditorState, EditorAction, LocalTable, TABLE_DEFAULTS } from "./types";

const MAX_UNDO = 20;

function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function pushUndo(state: EditorState): LocalTable[][] {
  const snapshot = state.tables.map((t) => ({ ...t }));
  const stack = [...state.undoStack, snapshot];
  if (stack.length > MAX_UNDO) stack.shift();
  return stack;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "LOAD_TABLES":
      return { ...state, tables: action.tables, hasUnsavedChanges: false };

    case "ADD_TABLE":
      return {
        ...state,
        tables: [...state.tables, action.table],
        selectedIds: [action.table.id],
        mode: "select",
        hasUnsavedChanges: true,
        undoStack: pushUndo(state),
      };

    case "UPDATE_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id ? { ...t, ...action.updates, isDirty: true } : t,
        ),
        hasUnsavedChanges: true,
      };

    case "DELETE_TABLES": {
      return {
        ...state,
        tables: state.tables.map((t) =>
          action.ids.includes(t.id) ? { ...t, isDeleted: true, isDirty: true } : t,
        ),
        selectedIds: state.selectedIds.filter((id) => !action.ids.includes(id)),
        hasUnsavedChanges: true,
        undoStack: pushUndo(state),
      };
    }

    case "SELECT_TABLE":
      if (action.addToSelection) {
        const alreadySelected = state.selectedIds.includes(action.id);
        return {
          ...state,
          selectedIds: alreadySelected
            ? state.selectedIds.filter((id) => id !== action.id)
            : [...state.selectedIds, action.id],
        };
      }
      return { ...state, selectedIds: [action.id] };

    case "SELECT_TABLES":
      return { ...state, selectedIds: action.ids };

    case "DESELECT_ALL":
      return { ...state, selectedIds: [] };

    case "SET_MODE":
      return { ...state, mode: action.mode };

    case "MOVE_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id
            ? {
                ...t,
                x: snapToGrid(action.x, state.gridSize),
                y: snapToGrid(action.y, state.gridSize),
                isDirty: true,
              }
            : t,
        ),
        hasUnsavedChanges: true,
      };

    case "BATCH_MOVE":
      return {
        ...state,
        tables: state.tables.map((t) => {
          const move = action.moves.find((m) => m.id === t.id);
          if (!move) return t;
          return {
            ...t,
            x: snapToGrid(move.x, state.gridSize),
            y: snapToGrid(move.y, state.gridSize),
            isDirty: true,
          };
        }),
        hasUnsavedChanges: true,
      };

    case "RESIZE_TABLE":
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id
            ? {
                ...t,
                width: Math.max(40, snapToGrid(action.width, state.gridSize)),
                height: Math.max(40, snapToGrid(action.height, state.gridSize)),
                isDirty: true,
              }
            : t,
        ),
        hasUnsavedChanges: true,
      };

    case "ROTATE_TABLE": {
      const snappedRotation = Math.round(action.rotation / 15) * 15;
      return {
        ...state,
        tables: state.tables.map((t) =>
          t.id === action.id
            ? { ...t, rotation: ((snappedRotation % 360) + 360) % 360, isDirty: true }
            : t,
        ),
        hasUnsavedChanges: true,
      };
    }

    case "SET_ZOOM":
      return { ...state, zoom: Math.min(3.0, Math.max(0.3, action.zoom)) };

    case "SET_PAN":
      return { ...state, panOffset: action.offset };

    case "SET_GRID_SIZE":
      return { ...state, gridSize: action.size };

    case "SET_DRAGGING":
      return { ...state, isDragging: action.isDragging };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const newStack = [...state.undoStack];
      const previous = newStack.pop()!;
      return {
        ...state,
        tables: previous,
        undoStack: newStack,
        selectedIds: [],
        hasUnsavedChanges: true,
      };
    }

    case "DUPLICATE_SELECTED": {
      const selectedTables = state.tables.filter(
        (t) => state.selectedIds.includes(t.id) && !t.isDeleted,
      );
      if (selectedTables.length === 0) return state;

      const newTables = selectedTables.map((t) => {
        const defaults = TABLE_DEFAULTS[t.shape];
        return {
          ...t,
          id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          convexId: undefined,
          x: t.x + 20,
          y: t.y + 20,
          label: `${t.label} copy`,
          isDirty: true,
          isNew: true,
          sortOrder: state.tables.length + 1,
        } as LocalTable;
      });

      return {
        ...state,
        tables: [...state.tables, ...newTables],
        selectedIds: newTables.map((t) => t.id),
        hasUnsavedChanges: true,
        undoStack: pushUndo(state),
      };
    }

    case "SET_SAVING":
      return { ...state, isSaving: action.isSaving };

    case "MARK_SAVED": {
      let updatedTables = state.tables.filter((t) => !t.isDeleted);
      if (action.idMap) {
        updatedTables = updatedTables.map((t) => {
          const newId = action.idMap!.get(t.id);
          if (newId) {
            return { ...t, id: newId, convexId: newId as any, isNew: false, isDirty: false };
          }
          return { ...t, isDirty: false };
        });
      } else {
        updatedTables = updatedTables.map((t) => ({ ...t, isDirty: false }));
      }
      return { ...state, tables: updatedTables, hasUnsavedChanges: false, isSaving: false };
    }

    case "PUSH_UNDO":
      return { ...state, undoStack: pushUndo(state) };

    default:
      return state;
  }
}
