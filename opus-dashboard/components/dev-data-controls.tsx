"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { IconDatabasePlus, IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface DevDataControlsProps {
  orgId: Id<"orgs">;
  collapsed?: boolean;
}

export function DevDataControls({ orgId, collapsed = false }: DevDataControlsProps) {
  const seedMockData = useMutation(api.dev.seedMockData);
  const clearMockData = useMutation(api.dev.clearMockData);
  const [pendingAction, setPendingAction] = useState<"seed" | "clear" | null>(null);

  if (process.env.NODE_ENV !== "development") return null;

  const handleSeed = async () => {
    setPendingAction("seed");
    try {
      const result = await seedMockData({ orgId, targetDateMs: Date.now() });
      toast.success(
        `Added ${result.totalBookings} bookings and ${result.totalCustomers} customers.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add mock data.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleClear = async () => {
    setPendingAction("clear");
    try {
      const result = await clearMockData({ orgId });
      toast.success(
        `Cleared ${result.deletedBookingsCount} bookings and ${result.deletedCustomersCount} customers.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear mock data.");
    } finally {
      setPendingAction(null);
    }
  };

  const controls = [
    {
      label: "Add mock data",
      icon: IconDatabasePlus,
      action: handleSeed,
      pending: pendingAction === "seed",
      variant: "outline" as const,
    },
    {
      label: "Clear mock data",
      icon: IconTrash,
      action: handleClear,
      pending: pendingAction === "clear",
      variant: "ghost" as const,
    },
  ];

  return (
    <div className={cn("flex gap-1.5", collapsed ? "flex-col" : "flex-col px-1")}>
      {controls.map(({ label, icon: Icon, action, pending, variant }) => {
        const button = (
          <Button
            key={label}
            type="button"
            variant={variant}
            size={collapsed ? "icon-lg" : "sm"}
            onClick={() => void action()}
            disabled={pendingAction !== null}
            aria-label={label}
            className={cn(!collapsed && "w-full justify-start")}
          >
            <Icon data-icon={collapsed ? undefined : "inline-start"} />
            {!collapsed && <span>{pending ? `${label}…` : label}</span>}
          </Button>
        );

        if (!collapsed) return button;

        return (
          <Tooltip key={label}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
