"use client";

import { useMediaQuery } from "@/hooks/use-media-query";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import {
  bookingDateKey,
  dateFromKey,
  dateKey,
  monthKey,
} from "@/lib/booking-wall-clock";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

// Keep the drawer controls ready; load the form and its calendar on opening.
// Data queries below start immediately, in parallel with this chunk.
const QuickBookingForm = dynamic(() => import("./QuickBookingForm"), {
  loading: QuickBookingFormLoading,
});

function QuickBookingFormLoading() {
  const { t } = useDashboardI18n();
  return (
    <div
      role="status"
      className="flex min-h-64 flex-1 items-center justify-center gap-2 p-5 text-sm text-muted-foreground"
    >
      <Spinner />
      {t(
        "Loading booking form…",
        "Вчитување на формуларот за термин…",
        "Po ngarkohet formulari i rezervimit…",
      )}
    </div>
  );
}

export type QuickBookingSelection = {
  staffId: Id<"staff_members">;
  startAt: number;
  endAt: number;
  durationMins: number;
  availableDurationMins: number;
  isFallback: boolean;
};

type OpenQuickBookingOptions = {
  slot?: QuickBookingSelection;
  date?: Date | string;
};

type QuickBookingContextValue = {
  openQuickBooking: (options?: OpenQuickBookingOptions) => void;
};

const QuickBookingContext = createContext<QuickBookingContextValue | null>(
  null,
);

export function useQuickBooking() {
  const value = useContext(QuickBookingContext);
  if (!value) {
    throw new Error(
      "useQuickBooking must be used within QuickBookingProvider.",
    );
  }
  return value;
}

export function QuickBookingProvider({
  orgId,
  children,
}: {
  orgId: Id<"orgs">;
  children: ReactNode;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { t } = useDashboardI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [requestDate, setRequestDate] = useState(() => dateKey(new Date()));
  const [pickerMonth, setPickerMonth] = useState(() => monthKey(new Date()));
  const [selection, setSelection] = useState<QuickBookingSelection | null>(
    null,
  );
  const [openSequence, setOpenSequence] = useState(0);
  const [selectedServiceIds, setSelectedServiceIds] = useState<
    Id<"services">[]
  >([]);

  const services = useQuery(
    api.services.listServices,
    isOpen ? { orgId, isActive: true } : "skip",
  );
  const staffMembers = useQuery(
    api.staff.listStaffMembers,
    isOpen ? { orgId } : "skip",
  );
  const automaticSlots = useQuery(
    api.slots.getQuickBookingSlots,
    isOpen
      ? { orgId, date: requestDate, serviceIds: selectedServiceIds }
      : "skip",
  );
  const availableDates = useQuery(
    api.slots.getQuickBookingAvailableDates,
    isOpen
      ? { orgId, month: pickerMonth, serviceIds: selectedServiceIds }
      : "skip",
  );

  const resolvedSelection = selection
    ? (automaticSlots?.slots.find(
        (slot) =>
          slot.staffId === selection.staffId &&
          slot.startAt === selection.startAt,
      ) ?? null)
    : (automaticSlots?.slots.find((slot) => !slot.isFallback) ??
      automaticSlots?.slots[0] ??
      null);

  const openQuickBooking = useCallback(
    (options: OpenQuickBookingOptions = {}) => {
      const requestedDate =
        typeof options.date === "string"
          ? options.date
          : dateKey(options.date ?? new Date());
      const nextDate = options.slot
        ? bookingDateKey(options.slot.startAt)
        : dateFromKey(requestedDate)
          ? requestedDate
          : dateKey(new Date());
      setRequestDate(nextDate);
      setPickerMonth(nextDate.slice(0, 7));
      setSelection(options.slot ?? null);
      setSelectedServiceIds([]);
      setOpenSequence((current) => current + 1);
      setIsOpen(true);
    },
    [],
  );

  const handleDateSelect = useCallback((date: Date) => {
    const nextDate = dateKey(date);
    setRequestDate(nextDate);
    setPickerMonth(nextDate.slice(0, 7));
    setSelection(null);
  }, []);

  const handleSlotSelect = useCallback((slot: QuickBookingSelection) => {
    setSelection(slot);
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) setSelection(null);
  }, []);

  const value = useMemo(() => ({ openQuickBooking }), [openQuickBooking]);

  return (
    <QuickBookingContext.Provider value={value}>
      {children}
      <Drawer
        direction={isDesktop ? "right" : "bottom"}
        open={isOpen}
        onOpenChange={handleOpenChange}
      >
        <DrawerContent
          aria-describedby={undefined}
          className="dashboard-panel data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md data-[vaul-drawer-direction=bottom]:h-[94dvh] data-[vaul-drawer-direction=bottom]:max-h-[94dvh] data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:rounded-t-3xl"
        >
          <DrawerHeader className="shrink-0 px-5 py-5 text-left">
            <div className="flex items-center justify-between gap-4">
              <DrawerTitle data-replay-public className="font-display text-xl">
                {t("New Booking", "Нов термин", "Rezervim i ri")}
              </DrawerTitle>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t(
                    "Close booking drawer",
                    "Затвори го панелот за закажување",
                    "Mbyll panelin e rezervimit",
                  )}
                >
                  <X />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <QuickBookingForm
            key={openSequence}
            orgId={orgId}
            requestDate={requestDate}
            selection={resolvedSelection}
            pickerMonth={pickerMonth}
            availableDates={availableDates?.availableDates}
            availableSlots={automaticSlots?.slots}
            services={services}
            selectedServiceIds={selectedServiceIds}
            onServiceIdsChange={setSelectedServiceIds}
            staffMembers={staffMembers}
            isLoadingAutomaticSlot={automaticSlots === undefined}
            isLoadingAvailableDates={availableDates === undefined}
            onPickerMonthChange={(date) => setPickerMonth(monthKey(date))}
            onDateSelect={handleDateSelect}
            onSlotSelect={handleSlotSelect}
            onBooked={() => handleOpenChange(false)}
          />
        </DrawerContent>
      </Drawer>
    </QuickBookingContext.Provider>
  );
}
