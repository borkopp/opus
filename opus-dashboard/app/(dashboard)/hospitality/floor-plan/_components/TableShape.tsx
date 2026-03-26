"use client";

import { Group, Rect, Circle, Text } from "react-konva";
import { LocalTable, EditorAction } from "./types";
import Konva from "konva";

interface TableShapeProps {
  table: LocalTable;
  isSelected: boolean;
  dispatch: React.Dispatch<EditorAction>;
  onSelect: (id: string, addToSelection: boolean) => void;
}

export default function TableShape({ table, isSelected, dispatch, onSelect }: TableShapeProps) {
  if (table.isDeleted) return null;

  const handleDragStart = () => {
    dispatch({ type: "PUSH_UNDO" });
    dispatch({ type: "SET_DRAGGING", isDragging: true });
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    dispatch({ type: "MOVE_TABLE", id: table.id, x: node.x(), y: node.y() });
    dispatch({ type: "SET_DRAGGING", isDragging: false });
  };

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    const isMulti = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
    onSelect(table.id, isMulti);
  };

  const fill = isSelected ? "#FDF0ED" : "#FFFFFF";
  const stroke = isSelected ? "#E8472A" : "#1A1A18";
  const strokeWidth = isSelected ? 2 : 1.5;

  const labelText = table.label;
  const capacityText = `${table.capacity} seats`;

  // Wrap all shapes into a group
  return (
    <Group
      id={table.id}
      x={table.x}
      y={table.y}
      rotation={table.rotation}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
    >
      {/* Shape */}
      {table.shape === "circle" ? (
        <Circle
          x={table.width / 2}
          y={table.height / 2}
          radius={Math.min(table.width, table.height) / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : (
        <Rect
          width={table.width}
          height={table.height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          cornerRadius={table.shape === "booth" ? [16, 16, 4, 4] : 8}
        />
      )}

      {/* Label */}
      <Text
        text={labelText}
        x={0}
        y={table.height / 2 - 14}
        width={table.width}
        align="center"
        fontSize={13}
        fontFamily="var(--font-dm-sans), sans-serif"
        fontStyle="500"
        fill="#1A1A18"
        listening={false}
      />

      {/* Capacity */}
      <Text
        text={capacityText}
        x={0}
        y={table.height / 2 + 2}
        width={table.width}
        align="center"
        fontSize={11}
        fontFamily="var(--font-dm-sans), sans-serif"
        fill="#6B6660"
        listening={false}
      />
    </Group>
  );
}
