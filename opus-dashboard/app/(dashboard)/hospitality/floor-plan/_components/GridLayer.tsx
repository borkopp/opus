"use client";

import { Layer, Line } from "react-konva";

interface GridLayerProps {
  width: number;
  height: number;
  gridSize: number;
  zoom: number;
  panOffset: { x: number; y: number };
}

export default function GridLayer({ width, height, gridSize, zoom, panOffset }: GridLayerProps) {
  const lines: React.ReactNode[] = [];

  // Calculate visible area in canvas coordinates
  const startX = Math.floor(-panOffset.x / zoom / gridSize) * gridSize - gridSize;
  const startY = Math.floor(-panOffset.y / zoom / gridSize) * gridSize - gridSize;
  const endX = startX + width / zoom + gridSize * 2;
  const endY = startY + height / zoom + gridSize * 2;

  // Vertical lines
  for (let x = startX; x <= endX; x += gridSize) {
    lines.push(
      <Line
        key={`v_${x}`}
        points={[x, startY, x, endY]}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={0.5 / zoom}
        listening={false}
      />,
    );
  }

  // Horizontal lines
  for (let y = startY; y <= endY; y += gridSize) {
    lines.push(
      <Line
        key={`h_${y}`}
        points={[startX, y, endX, y]}
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={0.5 / zoom}
        listening={false}
      />,
    );
  }

  return <Layer listening={false}>{lines}</Layer>;
}
