"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { Stage, Layer } from "react-konva";
import Konva from "konva";
import GridLayer from "./GridLayer";
import TableShape from "./TableShape";
import SelectionOverlay from "./SelectionOverlay";
import ResizeHandles from "./ResizeHandles";
import { LocalTable, EditorAction, EditorMode, TABLE_DEFAULTS, TableShapeType } from "./types";
import { Id } from "@/convex/_generated/dataModel";

interface EditorCanvasProps {
  tables: LocalTable[];
  selectedIds: string[];
  mode: EditorMode;
  zoom: number;
  panOffset: { x: number; y: number };
  gridSize: 10 | 20 | 40;
  isDragging: boolean;
  floorPlanId: Id<"floor_plans">;
  dispatch: React.Dispatch<EditorAction>;
  isSpaceHeld: React.MutableRefObject<boolean>;
}

export default function EditorCanvas({
  tables,
  selectedIds,
  mode,
  zoom,
  panOffset,
  gridSize,
  isDragging,
  floorPlanId,
  dispatch,
  isSpaceHeld,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Zoom via scroll wheel
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const scaleBy = 1.05;
      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

      const mousePointTo = {
        x: (pointer.x - panOffset.x) / oldScale,
        y: (pointer.y - panOffset.y) / oldScale,
      };

      dispatch({ type: "SET_ZOOM", zoom: newScale });
      dispatch({
        type: "SET_PAN",
        offset: {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        },
      });
    },
    [zoom, panOffset, dispatch],
  );

  // Stage click — place table in add mode, or deselect
  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only process clicks on the stage background
      if (e.target !== e.target.getStage()) return;

      if (mode.startsWith("add_")) {
        const stage = stageRef.current;
        if (!stage) return;
        const pos = stage.getRelativePointerPosition();
        if (!pos) return;

        const shape = mode.replace("add_", "") as TableShapeType;
        const defaults = TABLE_DEFAULTS[shape];
        const snappedX = Math.round(pos.x / gridSize) * gridSize;
        const snappedY = Math.round(pos.y / gridSize) * gridSize;

        const existingCount = tables.filter((t) => !t.isDeleted).length;

        const newTable: LocalTable = {
          id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          floorPlanId,
          label: `T${existingCount + 1}`,
          capacity: shape === "booth" ? 6 : shape === "circle" ? 4 : 4,
          shape,
          x: snappedX - defaults.width / 2,
          y: snappedY - defaults.height / 2,
          width: defaults.width,
          height: defaults.height,
          rotation: 0,
          status: "available",
          sortOrder: existingCount + 1,
          isDirty: true,
          isNew: true,
          isDeleted: false,
        };

        dispatch({ type: "ADD_TABLE", table: newTable });
        return;
      }

      // Clicked on empty canvas in select mode — deselect
      dispatch({ type: "DESELECT_ALL" });
    },
    [mode, tables, gridSize, floorPlanId, dispatch],
  );

  // Pan via space+drag
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isSpaceHeld.current) {
        isPanning.current = true;
        const pos = stageRef.current?.getPointerPosition();
        if (pos) lastPointer.current = pos;
      }
    },
    [isSpaceHeld],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isPanning.current) return;
      const pos = stageRef.current?.getPointerPosition();
      if (!pos) return;
      dispatch({
        type: "SET_PAN",
        offset: {
          x: panOffset.x + (pos.x - lastPointer.current.x),
          y: panOffset.y + (pos.y - lastPointer.current.y),
        },
      });
      lastPointer.current = pos;
    },
    [panOffset, dispatch],
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleTableSelect = useCallback(
    (id: string, addToSelection: boolean) => {
      dispatch({ type: "SELECT_TABLE", id, addToSelection });
    },
    [dispatch],
  );

  const visibleTables = tables.filter((t) => !t.isDeleted);
  const selectedTable =
    selectedIds.length === 1 ? visibleTables.find((t) => t.id === selectedIds[0]) : null;

  const cursorStyle =
    mode.startsWith("add_")
      ? "crosshair"
      : isSpaceHeld.current
        ? "grab"
        : "default";

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-background overflow-hidden relative"
      style={{ cursor: cursorStyle }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panOffset.x}
        y={panOffset.y}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Grid */}
        <GridLayer
          width={stageSize.width}
          height={stageSize.height}
          gridSize={gridSize}
          zoom={zoom}
          panOffset={panOffset}
        />

        {/* Tables */}
        <Layer>
          {visibleTables.map((table) => (
            <TableShape
              key={table.id}
              table={table}
              isSelected={selectedIds.includes(table.id)}
              dispatch={dispatch}
              onSelect={handleTableSelect}
            />
          ))}
        </Layer>

        {/* Resize/rotation handles for single selection */}
        {selectedTable && (
          <Layer>
            <ResizeHandles table={selectedTable} dispatch={dispatch} />
          </Layer>
        )}

        {/* Multi-select rubber band */}
        <SelectionOverlay
          active={mode === "multiselect"}
          tables={visibleTables}
          dispatch={dispatch}
          zoom={zoom}
          panOffset={panOffset}
        />
      </Stage>
    </div>
  );
}
