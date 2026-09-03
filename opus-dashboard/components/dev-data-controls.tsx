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
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { cn } from "@/lib/utils";

interface DevDataControlsProps {
  orgId: Id<"orgs">;
  collapsed?: boolean;
}

export function DevDataControls({
  orgId,
  collapsed = false,
}: DevDataControlsProps) {
  const { t } = useDashboardI18n();
  const seedMockData = useMutation(api.dev.seedMockData);
  const clearMockData = useMutation(api.dev.clearMockData);
  const [pendingAction, setPendingAction] = useState<"seed" | "clear" | null>(
    null,
  );

  if (process.env.NODE_ENV !== "development") return null;

  const handleSeed = async () => {
    setPendingAction("seed");
    try {
      const result = await seedMockData({ orgId, targetDateMs: Date.now() });
      toast.success(
        t(
          `Added ${result.totalBookings} bookings and ${result.totalCustomers} customers.`,
          `Додадени се ${result.totalBookings} термини и ${result.totalCustomers} клиенти.`,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Failed to add mock data.",
              "Не успеа додавањето на тест податоци.",
            ),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const handleClear = async () => {
    setPendingAction("clear");
    try {
      const result = await clearMockData({ orgId });
      toast.success(
        t(
          `Cleared ${result.deletedBookingsCount} bookings and ${result.deletedCustomersCount} customers.`,
          `Избришани се ${result.deletedBookingsCount} термини и ${result.deletedCustomersCount} клиенти.`,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Failed to clear mock data.",
              "Не успеа бришењето на тест податоци.",
            ),
      );
    } finally {
      setPendingAction(null);
    }
  };

  const controls = [
    {
      id: "seed",
      label: t("Add mock data", "Додај тест податоци"),
      icon: IconDatabasePlus,
      action: handleSeed,
      pending: pendingAction === "seed",
      variant: "outline" as const,
    },
    {
      id: "clear",
      label: t("Clear mock data", "Избриши тест податоци"),
      icon: IconTrash,
      action: handleClear,
      pending: pendingAction === "clear",
      variant: "ghost" as const,
    },
  ];

  return (
    <div
      className={cn("flex gap-1.5", collapsed ? "flex-col" : "flex-col px-1")}
    >
      {controls.map(({ id, label, icon: Icon, action, pending, variant }) => {
        const button = (
          <Button
            key={id}
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
          <Tooltip key={id}>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
