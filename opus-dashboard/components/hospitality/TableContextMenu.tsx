"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

interface TableContextMenuProps {
  table: any;
  orgId: Id<"orgs">;
  position: { x: number; y: number };
  onClose: () => void;
}

export function TableContextMenu({ table, orgId, position, onClose }: TableContextMenuProps) {
  const updateStatus = useMutation(api.hospitality.tables.updateTableStatus);

  const actions = getActionsForStatus(table.status);

  async function handleAction(action: string) {
    try {
      if (action === "available") {
        await updateStatus({ orgId, tableId: table._id, status: "available" });
        toast.success(`${table.label} marked available`);
      } else if (action === "cleaning") {
        await updateStatus({ orgId, tableId: table._id, status: "cleaning" });
        toast.success(`${table.label} marked cleaning`);
      } else if (action === "inactive") {
        await updateStatus({ orgId, tableId: table._id, status: "inactive" });
        toast.success(`${table.label} marked inactive`);
      }
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
    onClose();
  }

  return (
    <>
      {/* Click-outside backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="absolute z-50 bg-card rounded-xl border border-border shadow-xl py-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-150"
        style={{ top: position.y, left: position.x }}
      >
        {actions.map((a, i) =>
          a.separator ? (
            <div key={i} className="h-px bg-border my-1 mx-2" />
          ) : (
            <button
              key={a.action}
              onClick={() => handleAction(a.action!)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors text-left"
            >
              <span className={`h-2 w-2 rounded-full ${a.dotColor}`} />
              {a.label}
            </button>
          ),
        )}
      </div>
    </>
  );
}

type ContextAction = { action?: string; label?: string; dotColor?: string; separator?: boolean };

function getActionsForStatus(status: string): ContextAction[] {
  switch (status) {
    case "available":
      return [
        { action: "cleaning", label: "Mark as cleaning", dotColor: "bg-amber-400" },
        { action: "inactive", label: "Mark inactive", dotColor: "bg-muted-foreground/40" },
      ];
    case "reserved":
      return [
        { action: "cleaning", label: "Mark as cleaning", dotColor: "bg-amber-400" },
        { separator: true },
        { action: "inactive", label: "Mark inactive", dotColor: "bg-muted-foreground/40" },
      ];
    case "occupied":
      return [
        { action: "cleaning", label: "Mark as cleaning", dotColor: "bg-amber-400" },
        { action: "available", label: "Clear table", dotColor: "bg-green-400" },
        { separator: true },
        { action: "inactive", label: "Mark inactive", dotColor: "bg-muted-foreground/40" },
      ];
    case "cleaning":
      return [
        { action: "available", label: "Mark available", dotColor: "bg-green-400" },
        { separator: true },
        { action: "inactive", label: "Mark inactive", dotColor: "bg-muted-foreground/40" },
      ];
    case "inactive":
      return [
        { action: "available", label: "Mark available", dotColor: "bg-green-400" },
      ];
    default:
      return [
        { action: "available", label: "Mark available", dotColor: "bg-green-400" },
      ];
  }
}
