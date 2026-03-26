"use client";

import { useState, useRef } from "react";
import { Layer, Rect } from "react-konva";
import { LocalTable, EditorAction } from "./types";
import Konva from "konva";

interface SelectionOverlayProps {
  active: boolean;
  tables: LocalTable[];
  dispatch: React.Dispatch<EditorAction>;
  zoom: number;
  panOffset: { x: number; y: number };
}

export default function SelectionOverlay({
  active,
  tables,
  dispatch,
  zoom,
  panOffset,
}: SelectionOverlayProps) {
  const [selRect, setSelRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  if (!active) return <Layer listening={false} />;

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    startRef.current = pos;
    setSelRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!startRef.current) return;
    const stage = e.target.getStage();
    if (!stage) return;
    const pos = stage.getRelativePointerPosition();
    if (!pos) return;
    setSelRect({
      x: Math.min(startRef.current.x, pos.x),
      y: Math.min(startRef.current.y, pos.y),
      width: Math.abs(pos.x - startRef.current.x),
      height: Math.abs(pos.y - startRef.current.y),
    });
  };

  const handleMouseUp = () => {
    if (selRect && selRect.width > 5 && selRect.height > 5) {
      // Find tables intersecting the selection rect
      const selectedIds = tables
        .filter((t) => {
          if (t.isDeleted) return false;
          const tRight = t.x + t.width;
          const tBottom = t.y + t.height;
          const sRight = selRect.x + selRect.width;
          const sBottom = selRect.y + selRect.height;
          return t.x < sRight && tRight > selRect.x && t.y < sBottom && tBottom > selRect.y;
        })
        .map((t) => t.id);

      dispatch({ type: "SELECT_TABLES", ids: selectedIds });
    }
    startRef.current = null;
    setSelRect(null);
    dispatch({ type: "SET_MODE", mode: "select" });
  };

  return (
    <Layer
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Invisible full-area rect to catch events */}
      <Rect x={-10000} y={-10000} width={20000} height={20000} fill="transparent" />
      {selRect && selRect.width > 0 && (
        <Rect
          x={selRect.x}
          y={selRect.y}
          width={selRect.width}
          height={selRect.height}
          fill="rgba(232,71,42,0.08)"
          stroke="#E8472A"
          strokeWidth={1}
          dash={[4, 4]}
        />
      )}
    </Layer>
  );
}
