"use client";

import { useRef, useState, useCallback, useEffect, useMemo, ComponentType } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { TableActionPanel } from "./TableActionPanel";
import { TableContextMenu } from "./TableContextMenu";

interface LiveFloorPlanCanvasProps {
  tables: any[];
  filter: "all" | "available" | "reserved" | "occupied";
  selectedTableId: string | null;
  onTableClick: (tableId: string) => void;
  onContextMenu: (table: any, x: number, y: number) => void;
}

// Dynamic import Konva components to avoid SSR
const LiveFloorPlanCanvas = dynamic(
  () => import("./LiveFloorPlanCanvas") as Promise<{ default: ComponentType<LiveFloorPlanCanvasProps> }>,
  { ssr: false },
);

type StatusFilter = "all" | "available" | "reserved" | "occupied";

interface LiveFloorPlanProps {
  data: { floorPlan: any; tables: any[] } | null;
  orgId: Id<"orgs">;
}

export function LiveFloorPlan({ data, orgId }: LiveFloorPlanProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ table: any; x: number; y: number } | null>(null);

  const tables = data?.tables ?? [];
  const selectedTable = useMemo(
    () => tables.find((t: any) => t._id === selectedTableId) ?? null,
    [tables, selectedTableId],
  );

  const handleTableClick = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
    setContextMenu(null);
  }, []);

  const handleContextMenu = useCallback((table: any, x: number, y: number) => {
    setContextMenu({ table, x, y });
  }, []);

  const filterChips: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Available", value: "available" },
    { label: "Reserved", value: "reserved" },
    { label: "Occupied", value: "occupied" },
  ];

  return (
    <Card className="flex flex-col rounded-[20px] px-0.5 h-full overflow-hidden relative">
      {/* Header strip */}
      <div className="flex items-center justify-between px-5 pt-6 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold font-display text-primary">Live Floor Plan</h2>
          {/* <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Live</span>
          </span> */}
        </div>

        <div className="flex items-center">
          {/* Filter chips */}
          <div className="flex items-center gap-1">
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                onClick={() => setFilter(chip.value)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${filter === chip.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
                  }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <Link
            href="/hospitality/floor-plan"
            className="flex items-center gap-1 text-xs ml-12 font-semibold text-accent hover:text-accent/80 transition-colors"
          >
            Edit floor plan <IconArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Canvas + Panel */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 relative">
          {!data?.floorPlan ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No floor plan configured.{" "}
              <Link href="/hospitality/floor-plan" className="text-accent ml-1 underline">
                Create one
              </Link>
            </div>
          ) : (
            <LiveFloorPlanCanvas
              tables={tables}
              filter={filter}
              onTableClick={handleTableClick}
              onContextMenu={handleContextMenu}
              selectedTableId={selectedTableId}
            />
          )}

          {/* Context menu */}
          {contextMenu && (
            <TableContextMenu
              table={contextMenu.table}
              orgId={orgId}
              position={{ x: contextMenu.x, y: contextMenu.y }}
              onClose={() => setContextMenu(null)}
            />
          )}
        </div>

        {/* Action panel */}
        {selectedTable && (
          <TableActionPanel
            table={selectedTable}
            orgId={orgId}
            onClose={() => setSelectedTableId(null)}
          />
        )}
      </div>

      {/* Legend strip */}
      <div className="flex items-center gap-4 px-5 py-2 border-t border-border shrink-0">
        {[
          { label: "Available", color: "#FFFFFF", border: "#1A1A18" },
          { label: "Reserved", color: "#FDF0ED", border: "#E8472A" },
          { label: "Occupied", color: "#1A1A18", border: "#1A1A18" },
          { label: "Cleaning", color: "#FEF9E7", border: "#D4A017" },
          { label: "Inactive", color: "#F5F3F0", border: "#BDBCB6" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: item.color, border: `1.5px solid ${item.border}` }}
            />
            <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
