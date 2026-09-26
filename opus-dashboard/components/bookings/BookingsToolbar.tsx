"use client";

import { useState } from "react";
import {
  IconAdjustmentsHorizontal,
  IconLayoutColumns,
  IconLayoutRows,
  IconLayoutList,
  IconPlus,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import type { StaffView } from "./types";
import { BookingsDateNavigation } from "./BookingsDateNavigation";

export type BookingStatusFilter = "all" | "upcoming" | "completed" | "no-show";
export type BookingViewVariant = "horizontal" | "vertical" | "list";

export function BookingsToolbar({
  currentDate,
  bookingDateCounts,
  onDateChange,
  onNewBooking,
  isMobile,
  variant,
  onVariantChange,
  status,
  onStatusChange,
  staffMembers,
  staffId,
  onStaffChange,
}: {
  currentDate: Date;
  bookingDateCounts: ReadonlyMap<string, number>;
  onDateChange: (date: Date) => void;
  onNewBooking: () => void;
  isMobile: boolean;
  variant: BookingViewVariant;
  onVariantChange: (value: BookingViewVariant) => void;
  status: BookingStatusFilter;
  onStatusChange: (value: BookingStatusFilter) => void;
  staffMembers: StaffView[];
  staffId: string;
  onStaffChange: (value: string) => void;
}) {
  const { t } = useDashboardI18n();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const statuses: { value: BookingStatusFilter; label: string }[] = [
    { value: "all", label: t("All", "Сите") },
    { value: "upcoming", label: t("Upcoming", "Претстојни") },
    { value: "completed", label: t("Completed", "Завршени") },
    { value: "no-show", label: t("No-show", "Не се појави") },
  ];
  const statusOptions = (
    <ToggleGroup
      type="single"
      value={status}
      onValueChange={(value) => {
        if (value) onStatusChange(value as BookingStatusFilter);
      }}
      spacing={1}
      aria-label={t("Booking status", "Статус на термин")}
      className={isMobile ? "grid w-full grid-cols-2 gap-2" : "flex-wrap"}
    >
      {statuses.map((item) => (
        <ToggleGroupItem
          key={item.value}
          value={item.value}
          className="min-h-11 px-3 md:min-h-9"
        >
          {item.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 p-3">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 md:gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto]">
        <BookingsDateNavigation
          date={currentDate}
          bookingDateCounts={bookingDateCounts}
          onDateChange={onDateChange}
        />
        {isMobile ? (
          <Drawer autoFocus open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="min-h-11 gap-2">
                <IconAdjustmentsHorizontal data-icon="inline-start" />
                {status === "all"
                  ? t("Filters", "Филтри")
                  : statuses.find((item) => item.value === status)?.label}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="dashboard-panel">
              <DrawerHeader>
                <DrawerTitle data-replay-public>
                  {t("Filter appointments", "Филтрирај термини")}
                </DrawerTitle>
                <DrawerDescription data-replay-public>
                  {t(
                    "Choose which appointments to show for this day.",
                    "Изберете кои термини да се прикажат за овој ден.",
                  )}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-5 py-3">{statusOptions}</div>
              <DrawerFooter className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <DrawerClose asChild>
                  <Button data-replay-public className="min-h-11">
                    {t("Show appointments", "Прикажи термини")}
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          statusOptions
        )}
        <ToggleGroup
          type="single"
          value={variant}
          onValueChange={(value) => {
            if (value) onVariantChange(value as BookingViewVariant);
          }}
          spacing={1}
          aria-label={t("Calendar view", "Приказ на календар")}
          className="justify-self-end"
        >
          {!isMobile && (
            <ToggleGroupItem
              value="horizontal"
              aria-label={t("Horizontal", "Хоризонтално")}
              className="min-h-9"
            >
              <IconLayoutColumns />
              <span data-replay-public className="hidden xl:inline">
                {t("Horizontal", "Хоризонтално")}
              </span>
            </ToggleGroupItem>
          )}
          <ToggleGroupItem
            value="vertical"
            aria-label={t("Calendar", "Календар")}
            className="min-h-11 md:min-h-9"
          >
            <IconLayoutRows />
            <span data-replay-public className="hidden xl:inline">
              {t("Calendar", "Календар")}
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="list"
            aria-label={t("Agenda", "Листа")}
            className="min-h-11 md:min-h-9"
          >
            <IconLayoutList />
            <span data-replay-public className="hidden xl:inline">
              {t("Agenda", "Листа")}
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          className="size-11 shrink-0 md:h-9 md:w-auto"
          onClick={onNewBooking}
          aria-label={t("New Booking", "Нов термин")}
        >
          <IconPlus data-icon="inline-start" />
          <span data-replay-public className="hidden md:inline">
            {t("New Booking", "Нов термин")}
          </span>
        </Button>
      </div>
      {isMobile && variant === "vertical" && staffMembers.length > 1 && (
        <div className="min-w-0 overflow-x-auto overscroll-x-contain pb-1">
          <ToggleGroup
            type="single"
            value={staffId}
            onValueChange={(value) => {
              if (value) onStaffChange(value);
            }}
            spacing={2}
            variant="outline"
            aria-label={t("Staff calendar", "Календар на тимот")}
          >
            {staffMembers.map((staff) => (
              <ToggleGroupItem
                key={staff._id}
                value={staff._id}
                className="min-h-11 max-w-48"
              >
                <span className="truncate">{staff.displayName}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
