"use client";

import { Group, Rect, Circle } from "react-konva";
import { LocalTable, EditorAction } from "./types";
import Konva from "konva";

interface ResizeHandlesProps {
  table: LocalTable;
  dispatch: React.Dispatch<EditorAction>;
}

const HANDLE_SIZE = 8;

export default function ResizeHandles({ table, dispatch }: ResizeHandlesProps) {
  const corners = [
    { cx: 0, cy: 0, cursor: "nw-resize" },
    { cx: table.width, cy: 0, cursor: "ne-resize" },
    { cx: table.width, cy: table.height, cursor: "se-resize" },
    { cx: 0, cy: table.height, cursor: "sw-resize" },
  ];

  const handleResizeDragEnd = (
    e: Konva.KonvaEventObject<DragEvent>,
    cornerIndex: number,
  ) => {
    const node = e.target;
    const dx = node.x() - corners[cornerIndex].cx;
    const dy = node.y() - corners[cornerIndex].cy;

    let newWidth = table.width;
    let newHeight = table.height;

    if (cornerIndex === 0) {
      // top-left
      newWidth = table.width - dx;
      newHeight = table.height - dy;
    } else if (cornerIndex === 1) {
      // top-right
      newWidth = table.width + dx;
      newHeight = table.height - dy;
    } else if (cornerIndex === 2) {
      // bottom-right
      newWidth = table.width + dx;
      newHeight = table.height + dy;
    } else {
      // bottom-left
      newWidth = table.width - dx;
      newHeight = table.height + dy;
    }

    dispatch({
      type: "RESIZE_TABLE",
      id: table.id,
      width: Math.max(40, newWidth),
      height: Math.max(40, newHeight),
    });

    // Reset handle position
    node.x(corners[cornerIndex].cx);
    node.y(corners[cornerIndex].cy);
  };

  // Rotation handle — positioned above top-centre
  const handleRotationDrag = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const centreX = table.width / 2;
    const centreY = table.height / 2;
    const dx = node.x() - centreX;
    const dy = node.y() - centreY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    dispatch({ type: "ROTATE_TABLE", id: table.id, rotation: angle + table.rotation });

    // Reset to original position
    node.x(table.width / 2);
    node.y(-20);
  };

  return (
    <Group x={table.x} y={table.y} rotation={table.rotation} listening={true}>
      {/* Corner resize handles */}
      {corners.map((corner, i) => (
        <Rect
          key={i}
          x={corner.cx - HANDLE_SIZE / 2}
          y={corner.cy - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill="#FFFFFF"
          stroke="#1A1A18"
          strokeWidth={1}
          draggable
          onDragStart={() => dispatch({ type: "PUSH_UNDO" })}
          onDragEnd={(e) => handleResizeDragEnd(e, i)}
        />
      ))}

      {/* Rotation handle */}
      <Circle
        x={table.width / 2}
        y={-20}
        radius={5}
        fill="#FFFFFF"
        stroke="#E8472A"
        strokeWidth={1.5}
        draggable
        onDragEnd={handleRotationDrag}
      />
    </Group>
  );
}
