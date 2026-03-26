"use client";

import { useReducer, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { editorReducer } from "./editorReducer";
import { INITIAL_EDITOR_STATE, LocalTable } from "./types";
import { useEditorShortcuts } from "./useEditorShortcuts";
import EditorToolbar from "./EditorToolbar";
import TablePropertiesPanel from "./TablePropertiesPanel";
import EditorStatusBar from "./EditorStatusBar";

// Dynamic import for Konva (SSR-incompatible)
const EditorCanvas = dynamic(() => import("./EditorCanvas"), { ssr: false });

interface FloorPlanEditorProps {
  floorPlanId: Id<"floor_plans">;
  floorPlanName: string;
  initialTables: LocalTable[];
  orgId: Id<"orgs">;
}

export default function FloorPlanEditor({
  floorPlanId,
  floorPlanName,
  initialTables,
  orgId,
}: FloorPlanEditorProps) {
  const [state, dispatch] = useReducer(editorReducer, {
    ...INITIAL_EDITOR_STATE,
    tables: initialTables,
  });

  const isSpaceHeld = useRef(false);

  // Convex mutations
  const createTable = useMutation(api.hospitality.tables.createTable);
  const updateTable = useMutation(api.hospitality.tables.updateTable);
  const deleteTable = useMutation(api.hospitality.tables.deleteTable);
  const batchUpdatePositions = useMutation(api.hospitality.tables.batchUpdateTablePositions);

  // Keyboard shortcuts — handle Cmd+A with full table IDs
  useEditorShortcuts(dispatch, state.selectedIds, isSpaceHeld);

  // Derived values
  const visibleTables = useMemo(
    () => state.tables.filter((t) => !t.isDeleted),
    [state.tables],
  );

  const tableCount = visibleTables.length;
  const totalSeats = useMemo(
    () => visibleTables.reduce((sum, t) => sum + t.capacity, 0),
    [visibleTables],
  );

  // Save flow
  const handleSave = useCallback(async () => {
    dispatch({ type: "SET_SAVING", isSaving: true });

    try {
      const dirtyTables = state.tables.filter((t) => t.isDirty);
      const idMap = new Map<string, string>();

      // 1. Create new tables
      const newTables = dirtyTables.filter((t) => t.isNew && !t.isDeleted);
      for (const t of newTables) {
        const convexId = await createTable({
          orgId,
          floorPlanId,
          label: t.label,
          capacity: t.capacity,
          shape: t.shape,
          x: t.x,
          y: t.y,
          width: t.width,
          height: t.height,
          rotation: t.rotation,
          minCapacity: t.minCapacity,
        });
        idMap.set(t.id, convexId);
      }

      // 2. Delete tables marked for deletion (only existing ones)
      const deletedTables = dirtyTables.filter((t) => t.isDeleted && t.convexId);
      for (const t of deletedTables) {
        try {
          await deleteTable({
            orgId,
            tableId: t.convexId!,
          });
        } catch (e: any) {
          // If table has reservations, toast warning
          toast.error(`Could not delete ${t.label}: ${e.message}`);
        }
      }

      // 3. Batch update positions for existing dirty tables
      const positionUpdates = dirtyTables.filter(
        (t) => !t.isNew && !t.isDeleted && t.convexId,
      );

      if (positionUpdates.length > 0) {
        await batchUpdatePositions({
          orgId,
          updates: positionUpdates.map((t) => ({
            tableId: t.convexId!,
            x: t.x,
            y: t.y,
            rotation: t.rotation,
          })),
        });

        // Update individual table properties (label, capacity, shape, size)
        for (const t of positionUpdates) {
          await updateTable({
            orgId,
            tableId: t.convexId!,
            label: t.label,
            capacity: t.capacity,
            minCapacity: t.minCapacity,
            width: t.width,
            height: t.height,
            shape: t.shape,
          });
        }
      }

      dispatch({ type: "MARK_SAVED", idMap: idMap.size > 0 ? idMap : undefined });
      toast.success("Floor plan saved");
    } catch (e: any) {
      toast.error(`Save failed: ${e.message}`);
      dispatch({ type: "SET_SAVING", isSaving: false });
    }
  }, [state.tables, orgId, floorPlanId, createTable, updateTable, deleteTable, batchUpdatePositions]);

  return (
    <div className="flex flex-col h-full">
      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        <EditorToolbar
          mode={state.mode}
          selectedCount={state.selectedIds.length}
          zoom={state.zoom}
          dispatch={dispatch}
        />

        <EditorCanvas
          tables={state.tables}
          selectedIds={state.selectedIds}
          mode={state.mode}
          zoom={state.zoom}
          panOffset={state.panOffset}
          gridSize={state.gridSize}
          isDragging={state.isDragging}
          floorPlanId={floorPlanId}
          dispatch={dispatch}
          isSpaceHeld={isSpaceHeld}
        />

        <TablePropertiesPanel
          tables={state.tables}
          selectedIds={state.selectedIds}
          dispatch={dispatch}
        />
      </div>

      {/* Status bar */}
      <EditorStatusBar
        tableCount={tableCount}
        totalSeats={totalSeats}
        hasUnsavedChanges={state.hasUnsavedChanges}
        isSaving={state.isSaving}
        gridSize={state.gridSize}
        zoom={state.zoom}
        dispatch={dispatch}
        onSave={handleSave}
      />
    </div>
  );
}
