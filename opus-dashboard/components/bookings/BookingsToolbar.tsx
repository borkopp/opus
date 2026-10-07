"use client";

import { useState } from "react";
import { IconAdjustmentsHorizontal, IconPlus } from "@tabler/icons-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
export type BookingViewVariant =
  | "horizontal"
  | "vertical"
  | "list"
  | "week"
  | "month";

export function BookingsToolbar({
  currentDate,
  today,
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
  today?: Date;
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
    { value: "all", label: t("All", "Сите", "Të gjitha") },
    { value: "upcoming", label: t("Upcoming", "Претстојни", "Të ardhshme") },
    { value: "completed", label: t("Completed", "Завршени", "Të përfunduara") },
    { value: "no-show", label: t("No-show", "Не се појави", "Mosparaqitje") },
  ];
  const statusOptions = (
    <ToggleGroup
      type="single"
      value={status}
      onValueChange={(value) => {
        if (value) onStatusChange(value as BookingStatusFilter);
      }}
      spacing={1}
      aria-label={t("Booking status", "Статус на термин", "Statusi i terminit")}
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
          today={today}
          period={variant === "week" || variant === "month" ? variant : "day"}
          bookingDateCounts={bookingDateCounts}
          onDateChange={onDateChange}
        />
        {isMobile ? (
          <Drawer autoFocus open={filtersOpen} onOpenChange={setFiltersOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="min-h-11 gap-2">
                <IconAdjustmentsHorizontal data-icon="inline-start" />
                {status === "all"
                  ? t("Filters", "Филтри", "Filtra")
                  : statuses.find((item) => item.value === status)?.label}
              </Button>
            </DrawerTrigger>
            <DrawerContent className="dashboard-panel">
              <DrawerHeader>
                <DrawerTitle data-replay-public>
                  {t(
                    "Filter appointments",
                    "Филтрирај термини",
                    "Filtro terminet",
                  )}
                </DrawerTitle>
                <DrawerDescription data-replay-public>
                  {t(
                    "Choose which appointments to show.",
                    "Изберете кои термини да се прикажат.",
                    "Zgjidhni cilat termine të shfaqen.",
                  )}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-5 py-3">{statusOptions}</div>
              <DrawerFooter className="px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <DrawerClose asChild>
                  <Button data-replay-public className="min-h-11">
                    {t(
                      "Show appointments",
                      "Прикажи термини",
                      "Shfaq terminet",
                    )}
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          statusOptions
        )}
        <Select
          value={variant}
          onValueChange={(value) =>
            onVariantChange(value as BookingViewVariant)
          }
        >
          <SelectTrigger
            aria-label={t(
              "Calendar view",
              "Приказ на календар",
              "Pamja e kalendarit",
            )}
            className="min-h-11 w-28 justify-self-end md:min-h-9"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {!isMobile && (
                <SelectItem value="horizontal">
                  {t("Horizontal", "Хоризонтално", "Horizontale")}
                </SelectItem>
              )}
              <SelectItem value="vertical">
                {t("Day", "Ден", "Ditë")}
              </SelectItem>
              <SelectItem value="week">
                {t("Week", "Недела", "Javë")}
              </SelectItem>
              <SelectItem value="month">
                {t("Month", "Месец", "Muaj")}
              </SelectItem>
              <SelectItem value="list">
                {t("Agenda", "Листа", "Axhenda")}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          className="size-11 shrink-0 md:h-9 md:w-auto"
          onClick={onNewBooking}
          aria-label={t("New Booking", "Нов термин", "Termin i ri")}
        >
          <IconPlus data-icon="inline-start" />
          <span data-replay-public className="hidden md:inline">
            {t("New Booking", "Нов термин", "Termin i ri")}
          </span>
        </Button>
      </div>
      {(variant === "week" || variant === "month") && (
        <Select value={staffId} onValueChange={onStaffChange}>
          <SelectTrigger
            aria-label={t(
              "Staff calendar",
              "Календар на тимот",
              "Kalendari i stafit",
            )}
            className="min-h-11 w-full sm:max-w-72 md:min-h-9"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">
                {t("All team", "Цел тим", "I gjithë ekipi")}
              </SelectItem>
              {staffMembers.map((staff) => (
                <SelectItem key={staff._id} value={staff._id}>
                  {staff.displayName}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      )}
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
            aria-label={t(
              "Staff calendar",
              "Календар на тимот",
              "Kalendari i stafit",
            )}
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
