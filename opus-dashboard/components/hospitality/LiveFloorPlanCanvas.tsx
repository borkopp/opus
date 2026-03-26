"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Stage, Layer, Group, Rect, Circle, Text } from "react-konva";
import Konva from "konva";

interface LiveFloorPlanCanvasProps {
  tables: any[];
  filter: "all" | "available" | "reserved" | "occupied";
  selectedTableId: string | null;
  onTableClick: (tableId: string) => void;
  onContextMenu: (table: any, x: number, y: number) => void;
}

const STATUS_STYLES: Record<string, { fill: string; stroke: string; strokeWidth: number; textColor: string }> = {
  available: { fill: "#FFFFFF", stroke: "#1A1A18", strokeWidth: 1.5, textColor: "#1A1A18" },
  reserved: { fill: "#FDF0ED", stroke: "#E8472A", strokeWidth: 2, textColor: "#1A1A18" },
  occupied: { fill: "#1A1A18", stroke: "#1A1A18", strokeWidth: 1.5, textColor: "#FFFFFF" },
  cleaning: { fill: "#FEF9E7", stroke: "#D4A017", strokeWidth: 1.5, textColor: "#1A1A18" },
  inactive: { fill: "#F5F3F0", stroke: "#BDBCB6", strokeWidth: 1, textColor: "#999" },
};

export default function LiveFloorPlanCanvas({
  tables,
  filter,
  selectedTableId,
  onTableClick,
  onContextMenu,
}: LiveFloorPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 600, height: 400 });
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
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

  // Auto-fit all tables on mount
  useEffect(() => {
    if (tables.length === 0) return;
    const padding = 48;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    tables.forEach((t: any) => {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.width);
      maxY = Math.max(maxY, t.y + t.height);
    });

    const tablesWidth = maxX - minX + padding * 2;
    const tablesHeight = maxY - minY + padding * 2;
    const scaleX = stageSize.width / tablesWidth;
    const scaleY = stageSize.height / tablesHeight;
    const newZoom = Math.min(scaleX, scaleY, 2);

    setZoom(newZoom);
    setPanOffset({
      x: (stageSize.width - tablesWidth * newZoom) / 2 - minX * newZoom + padding * newZoom,
      y: (stageSize.height - tablesHeight * newZoom) / 2 - minY * newZoom + padding * newZoom,
    });
  }, [tables.length, stageSize.width, stageSize.height]);

  // Zoom via scroll wheel
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scaleBy = 1.05;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newZoom = direction > 0 ? zoom * scaleBy : zoom / scaleBy;
      const clampedZoom = Math.min(3, Math.max(0.3, newZoom));

      const mousePointTo = {
        x: (pointer.x - panOffset.x) / zoom,
        y: (pointer.y - panOffset.y) / zoom,
      };

      setZoom(clampedZoom);
      setPanOffset({
        x: pointer.x - mousePointTo.x * clampedZoom,
        y: pointer.y - mousePointTo.y * clampedZoom,
      });
    },
    [zoom, panOffset],
  );

  // Pan via middle click or space+drag
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || e.evt.button === 2) {
      isPanning.current = true;
      const pos = stageRef.current?.getPointerPosition();
      if (pos) lastPointer.current = pos;
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isPanning.current) return;
      const pos = stageRef.current?.getPointerPosition();
      if (!pos) return;
      setPanOffset((prev) => ({
        x: prev.x + (pos.x - lastPointer.current.x),
        y: prev.y + (pos.y - lastPointer.current.y),
      }));
      lastPointer.current = pos;
    },
    [],
  );

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-card">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panOffset.x}
        y={panOffset.y}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer>
          {tables.map((table: any) => {
            const style = STATUS_STYLES[table.status] ?? STATUS_STYLES.available;
            const isSelected = table._id === selectedTableId;
            const isDimmed = filter !== "all" && table.status !== filter;

            const opacity = isDimmed ? 0.3 : 1;
            const reservation = table.currentReservation;

            // Info text lines
            let line2 = "";
            let line3 = "";
            if (table.status === "occupied" && reservation) {
              line2 = table.customer?.name?.split(" ")[0] ?? "";
              const seatedAgo = Math.round((Date.now() - reservation.startAt) / 60000);
              line3 = `${seatedAgo}m ago`;
            } else if (table.status === "reserved" && reservation) {
              line2 = table.customer?.name?.split(" ")[0] ?? "";
              const h = new Date(reservation.startAt).getHours().toString().padStart(2, "0");
              const m = new Date(reservation.startAt).getMinutes().toString().padStart(2, "0");
              line3 = `${h}:${m}`;
            }

            const handleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
              e.cancelBubble = true;
              if (e.evt.button === 2) {
                // Right click — context menu
                const stageBox = stageRef.current?.container().getBoundingClientRect();
                if (stageBox) {
                  onContextMenu(table, e.evt.clientX - stageBox.left, e.evt.clientY - stageBox.top);
                }
                return;
              }
              onTableClick(table._id);
            };

            return (
              <Group
                key={table._id}
                x={table.x}
                y={table.y}
                rotation={table.rotation ?? 0}
                opacity={opacity}
                onClick={handleClick}
              >
                {/* Shape */}
                {table.shape === "circle" ? (
                  <Circle
                    x={table.width / 2}
                    y={table.height / 2}
                    radius={Math.min(table.width, table.height) / 2}
                    fill={style.fill}
                    stroke={isSelected ? "#E8472A" : style.stroke}
                    strokeWidth={isSelected ? 2.5 : style.strokeWidth}
                  />
                ) : (
                  <Rect
                    width={table.width}
                    height={table.height}
                    fill={style.fill}
                    stroke={isSelected ? "#E8472A" : style.stroke}
                    strokeWidth={isSelected ? 2.5 : style.strokeWidth}
                    cornerRadius={table.shape === "booth" ? [16, 16, 4, 4] : 8}
                  />
                )}

                {/* Label */}
                <Text
                  text={table.label}
                  x={0}
                  y={table.height / 2 - (line2 ? 16 : 8)}
                  width={table.width}
                  align="center"
                  fontSize={13}
                  fontStyle="600"
                  fill={style.textColor}
                  listening={false}
                />

                {/* Line 2: customer name */}
                {line2 && (
                  <Text
                    text={line2}
                    x={0}
                    y={table.height / 2}
                    width={table.width}
                    align="center"
                    fontSize={10}
                    fill={style.textColor}
                    listening={false}
                  />
                )}

                {/* Line 3: time info */}
                {line3 && (
                  <Text
                    text={line3}
                    x={0}
                    y={table.height / 2 + 12}
                    width={table.width}
                    align="center"
                    fontSize={9}
                    fill={table.status === "occupied" ? "rgba(255,255,255,0.6)" : "#6B6660"}
                    listening={false}
                  />
                )}
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}
