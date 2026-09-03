"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  CalendarClock,
  CalendarDays,
  Clock,
  Mail,
  Phone,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  bookingDateKey,
  bookingTimeLabel,
  dateFromKey,
  dateKey,
  monthFromKey,
  monthKey,
} from "@/lib/booking-wall-clock";
import { formatPrice } from "@/lib/format-price";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";

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

type Services =
  | FunctionReturnType<typeof api.services.listServices>
  | undefined;
type StaffMembers =
  | FunctionReturnType<typeof api.staff.listStaffMembers>
  | undefined;
type QuickBookingSlots = FunctionReturnType<
  typeof api.slots.getQuickBookingSlots
>["slots"];

function datePickerLabel(value: string, locale: string, placeholder: string) {
  const date = dateFromKey(value);
  if (!date) return placeholder;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatBookingDate(timestamp: number, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function quickSlotValue(slot: QuickBookingSelection) {
  return `${slot.staffId}:${slot.startAt}`;
}

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
  const { t } = useDashboardI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [requestDate, setRequestDate] = useState(() => dateKey(new Date()));
  const [pickerMonth, setPickerMonth] = useState(() => monthKey(new Date()));
  const [isScheduleEditable, setIsScheduleEditable] = useState(false);
  const [selection, setSelection] = useState<QuickBookingSelection | null>(
    null,
  );
  const [openSequence, setOpenSequence] = useState(0);

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
    isOpen && isScheduleEditable ? { orgId, date: requestDate } : "skip",
  );
  const availableDates = useQuery(
    api.slots.getQuickBookingAvailableDates,
    isOpen && isScheduleEditable ? { orgId, month: pickerMonth } : "skip",
  );

  const resolvedSelection =
    selection ??
    (isScheduleEditable
      ? (automaticSlots?.slots.find((slot) => !slot.isFallback) ??
        automaticSlots?.slots[0])
      : null) ??
    null;

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
      setIsScheduleEditable(!options.slot);
      setSelection(options.slot ?? null);
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
      <Drawer direction="right" open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
          <DrawerHeader className="border-b border-border px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-col gap-1">
                <DrawerTitle className="font-display text-xl">
                  {t("New booking", "Нов термин")}
                </DrawerTitle>
                <DrawerDescription>
                  {t(
                    "Add the customer and choose the services for this time.",
                    "Внесете клиент и изберете услуги за овој термин.",
                  )}
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t(
                    "Close booking drawer",
                    "Затвори го панелот за закажување",
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
            isScheduleEditable={isScheduleEditable}
            pickerMonth={pickerMonth}
            availableDates={availableDates?.availableDates}
            availableSlots={automaticSlots?.slots}
            services={services}
            staffMembers={staffMembers}
            isLoadingAutomaticSlot={
              isScheduleEditable && automaticSlots === undefined
            }
            isLoadingAvailableDates={
              isScheduleEditable && availableDates === undefined
            }
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

function QuickBookingSchedulePicker({
  requestDate,
  pickerMonth,
  availableDates,
  availableSlots,
  selection,
  staffMembers,
  isLoadingAvailableDates,
  isLoadingSlots,
  onPickerMonthChange,
  onDateSelect,
  onSlotSelect,
}: {
  requestDate: string;
  pickerMonth: string;
  availableDates: string[] | undefined;
  availableSlots: QuickBookingSlots | undefined;
  selection: QuickBookingSelection | null;
  staffMembers: StaffMembers;
  isLoadingAvailableDates: boolean;
  isLoadingSlots: boolean;
  onPickerMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  onSlotSelect: (slot: QuickBookingSelection) => void;
}) {
  const { locale, t } = useDashboardI18n();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const availableDateSet = useMemo(
    () => new Set(availableDates ?? []),
    [availableDates],
  );
  const selectedDate = dateFromKey(requestDate);
  const selectedSlotValue = selection ? quickSlotValue(selection) : "";
  const showStaffNames =
    new Set(availableSlots?.map((slot) => slot.staffId) ?? []).size > 1;

  const dateLabel = datePickerLabel(
    requestDate,
    locale,
    t("Choose an available date", "Изберете слободен датум"),
  );

  return (
    <FieldSet>
      <FieldLegend variant="label">{t("Appointment", "Термин")}</FieldLegend>
      <FieldDescription>
        {t(
          "Choose an available date and start time.",
          "Изберете слободен датум и почетно време.",
        )}
      </FieldDescription>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel>{t("Booking date", "Датум на термин")}</FieldLabel>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start font-normal"
                aria-label={`${t("Booking date", "Датум на термин")}: ${dateLabel}`}
              >
                <CalendarDays data-icon="inline-start" />
                {dateLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                month={monthFromKey(pickerMonth)}
                selected={
                  selectedDate && availableDateSet.has(requestDate)
                    ? selectedDate
                    : undefined
                }
                onMonthChange={onPickerMonthChange}
                onSelect={(date) => {
                  if (!date) return;
                  onDateSelect(date);
                  setIsDatePickerOpen(false);
                }}
                disabled={(date) =>
                  isLoadingAvailableDates ||
                  !availableDateSet.has(dateKey(date))
                }
                showOutsideDays={false}
                aria-label={t(
                  "Available booking dates",
                  "Слободни датуми за закажување",
                )}
              />
              <Separator />
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                {isLoadingAvailableDates && <Spinner />}
                {isLoadingAvailableDates
                  ? t(
                      "Checking date availability…",
                      "Проверка на достапност на датуми…",
                    )
                  : t(
                      "Dates without an available time are disabled.",
                      "Датумите без слободен термин се оневозможени.",
                    )}
              </div>
            </PopoverContent>
          </Popover>
        </Field>

        <Field>
          <FieldLabel id="quick-booking-time-label">
            {t("Available times", "Слободни термини")}
          </FieldLabel>
          <FieldDescription>
            {t(
              "Only free start times are shown.",
              "Се прикажуваат само слободните почетни времиња.",
            )}
          </FieldDescription>
          {isLoadingSlots ? (
            <div
              className="flex items-center gap-2 py-3 text-sm text-muted-foreground"
              role="status"
            >
              <Spinner />
              {t("Checking available times…", "Проверка на слободни термини…")}
            </div>
          ) : availableSlots && availableSlots.length > 0 ? (
            <ScrollArea className="h-44">
              <ToggleGroup
                type="single"
                variant="outline"
                spacing={2}
                value={selectedSlotValue}
                onValueChange={(value) => {
                  const slot = availableSlots.find(
                    (candidate) => quickSlotValue(candidate) === value,
                  );
                  if (slot) onSlotSelect(slot);
                }}
                aria-labelledby="quick-booking-time-label"
                className="grid w-full grid-cols-2 gap-2 pr-3"
              >
                {availableSlots.map((slot) => {
                  const staff = staffMembers?.find(
                    (member) => member._id === slot.staffId,
                  );
                  return (
                    <ToggleGroupItem
                      key={quickSlotValue(slot)}
                      value={quickSlotValue(slot)}
                      className="h-auto min-h-10 w-full flex-col gap-0.5 py-2"
                      aria-label={t(
                        `${bookingTimeLabel(slot.startAt)} to ${bookingTimeLabel(slot.endAt)}${staff ? ` with ${staff.displayName}` : ""}`,
                        `${bookingTimeLabel(slot.startAt)} до ${bookingTimeLabel(slot.endAt)}${staff ? ` кај ${staff.displayName}` : ""}`,
                      )}
                    >
                      <span className="tabular-nums">
                        {bookingTimeLabel(slot.startAt)}–
                        {bookingTimeLabel(slot.endAt)}
                      </span>
                      {showStaffNames && staff && (
                        <span className="max-w-full truncate text-xs font-normal text-muted-foreground">
                          {staff.displayName}
                        </span>
                      )}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </ScrollArea>
          ) : (
            <Empty className="border p-4 md:p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Clock />
                </EmptyMedia>
                <EmptyTitle>
                  {t("No times available", "Нема слободни термини")}
                </EmptyTitle>
                <EmptyDescription>
                  {t(
                    "Choose another enabled date in the calendar.",
                    "Изберете друг овозможен датум во календарот.",
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Field>
      </FieldGroup>
    </FieldSet>
  );
}

function QuickBookingForm({
  orgId,
  requestDate,
  selection,
  isScheduleEditable,
  pickerMonth,
  availableDates,
  availableSlots,
  services,
  staffMembers,
  isLoadingAutomaticSlot,
  isLoadingAvailableDates,
  onPickerMonthChange,
  onDateSelect,
  onSlotSelect,
  onBooked,
}: {
  orgId: Id<"orgs">;
  requestDate: string;
  selection: QuickBookingSelection | null;
  isScheduleEditable: boolean;
  pickerMonth: string;
  availableDates: string[] | undefined;
  availableSlots: QuickBookingSlots | undefined;
  services: Services;
  staffMembers: StaffMembers;
  isLoadingAutomaticSlot: boolean;
  isLoadingAvailableDates: boolean;
  onPickerMonthChange: (date: Date) => void;
  onDateSelect: (date: Date) => void;
  onSlotSelect: (slot: QuickBookingSelection) => void;
  onBooked: () => void;
}) {
  const { locale, t } = useDashboardI18n();
  const createManualBooking = useMutation(api.bookings.createManualBooking);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<
    Id<"services">[]
  >([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedStaff = staffMembers?.find(
    (staff) => staff._id === selection?.staffId,
  );
  const selectedServices =
    services?.filter((service) => selectedServiceIds.includes(service._id)) ??
    [];
  const totalDurationMins = selectedServices.reduce(
    (total, service) => total + service.durationMins,
    0,
  );
  const totalPriceMinorUnits = selectedServices.reduce(
    (total, service) => total + service.priceMinorUnits,
    0,
  );
  const selectedCurrency =
    selectedServices[0]?.currency ?? services?.[0]?.currency;
  const actualEndAt = selection
    ? selection.startAt + (totalDurationMins || selection.durationMins) * 60_000
    : null;
  const servicesFit = Boolean(
    selection &&
    totalDurationMins > 0 &&
    totalDurationMins <= selection.availableDurationMins,
  );
  const nameError = submitted && !customerName.trim();
  const servicesError = submitted && selectedServiceIds.length === 0;
  const canSubmit =
    Boolean(selection) &&
    Boolean(customerName.trim()) &&
    selectedServiceIds.length > 0 &&
    servicesFit &&
    !isSubmitting;
  const submitDisabled =
    !selection || isSubmitting || (totalDurationMins > 0 && !servicesFit);

  const toggleService = (serviceId: Id<"services">, checked: boolean) => {
    setSelectedServiceIds((current) =>
      checked
        ? current.includes(serviceId)
          ? current
          : [...current, serviceId]
        : current.filter((id) => id !== serviceId),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    if (!canSubmit || !selection) return;

    setIsSubmitting(true);
    try {
      await createManualBooking({
        orgId,
        staffId: selection.staffId,
        serviceIds: selectedServiceIds,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        startAt: selection.startAt,
      });
      posthog.capture("manual_booking_created", {
        service_count: selectedServiceIds.length,
        total_duration_mins: totalDurationMins,
        total_price_minor_units: totalPriceMinorUnits,
        currency: selectedCurrency,
        used_fallback_slot: selection.isFallback,
      });
      toast.success(t("Booking created", "Терминот е креиран"));
      onBooked();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Could not create the booking.",
              "Не може да се креира терминот.",
            ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
        {isScheduleEditable && (
          <QuickBookingSchedulePicker
            requestDate={requestDate}
            pickerMonth={pickerMonth}
            availableDates={availableDates}
            availableSlots={availableSlots}
            selection={selection}
            staffMembers={staffMembers}
            isLoadingAvailableDates={isLoadingAvailableDates}
            isLoadingSlots={isLoadingAutomaticSlot}
            onPickerMonthChange={onPickerMonthChange}
            onDateSelect={onDateSelect}
            onSlotSelect={onSlotSelect}
          />
        )}

        {selection ? (
          <section className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {formatBookingDate(selection.startAt, locale)}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {bookingTimeLabel(selection.startAt)}–
                  {bookingTimeLabel(actualEndAt ?? selection.endAt)}
                  {selectedStaff ? ` · ${selectedStaff.displayName}` : ""}
                </p>
              </div>
            </div>
            {selection.isFallback && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t(
                  "The preferred quick-booking duration does not fit here, so the smallest available slot is selected.",
                  "Претпочитаното времетраење за брзо закажување не одговара тука, па затоа е избран најмалиот слободен термин.",
                )}
              </p>
            )}
          </section>
        ) : !isScheduleEditable && isLoadingAutomaticSlot ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Spinner />
            {t(
              "Finding the next available time…",
              "Пронаоѓање на следниот слободен термин…",
            )}
          </div>
        ) : !isScheduleEditable ? (
          <Alert>
            <Clock />
            <AlertTitle>
              {t(
                "No quick-booking time available",
                "Нема слободен термин за брзо закажување",
              )}
            </AlertTitle>
            <AlertDescription>
              {t(
                `There is no available slot on ${requestDate}. Choose another day or click an available time in the calendar.`,
                `Нема слободен термин на ${requestDate}. Изберете друг ден или кликнете на слободно време во календарот.`,
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        <FieldSet>
          <FieldLegend variant="label">{t("Services", "Услуги")}</FieldLegend>
          <FieldDescription>
            {t(
              "Select one or more services. Their durations are combined.",
              "Изберете една или повеќе услуги. Нивното времетраење се комбинира.",
            )}
          </FieldDescription>
          <FieldGroup data-slot="checkbox-group" className="gap-2">
            {services === undefined ? (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Spinner />
                {t("Loading services…", "Вчитување услуги…")}
              </div>
            ) : services.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">
                {t(
                  "Add an active service before creating a booking.",
                  "Додајте активна услуга пред да креирате термин.",
                )}
              </p>
            ) : (
              services.map((service) => {
                const isAvailableForStaff = Boolean(
                  selection && service.staffIds.includes(selection.staffId),
                );
                const checked = selectedServiceIds.includes(service._id);
                return (
                  <label
                    key={service._id}
                    htmlFor={`quick-service-${service._id}`}
                    className={cn(
                      "block select-none",
                      isAvailableForStaff
                        ? "cursor-pointer"
                        : "cursor-not-allowed",
                    )}
                  >
                    <Field
                      orientation="horizontal"
                      variant="surface"
                      data-disabled={!isAvailableForStaff}
                      className={cn(
                        "transition-colors",
                        isAvailableForStaff && "hover:bg-muted/40",
                        checked &&
                          "border-primary/50 bg-primary/5 dark:bg-primary/10",
                      )}
                    >
                      <Checkbox
                        id={`quick-service-${service._id}`}
                        checked={checked}
                        disabled={!isAvailableForStaff}
                        onCheckedChange={(value) =>
                          toggleService(service._id, value === true)
                        }
                      />
                      <FieldContent>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium leading-snug">
                            {service.name}
                          </span>
                          <span className="shrink-0 text-sm font-medium">
                            {formatPrice(
                              service.priceMinorUnits,
                              service.currency,
                              locale,
                            )}
                          </span>
                        </div>
                        <FieldDescription>
                          {isAvailableForStaff
                            ? t(
                                `${service.durationMins} minutes`,
                                `${service.durationMins} минути`,
                              )
                            : t(
                                `Not available with ${selectedStaff?.displayName ?? "this staff member"}`,
                                `Не е достапно со ${selectedStaff?.displayName ?? "овој член на тим"}`,
                              )}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </label>
                );
              })
            )}
          </FieldGroup>
          <FieldError>
            {servicesError
              ? t("Select at least one service.", "Изберете барем една услуга.")
              : totalDurationMins > 0 && !servicesFit
                ? t(
                    `These services need ${totalDurationMins} minutes, but only ${selection?.availableDurationMins ?? 0} minutes are available from this time.`,
                    `За овие услуги се потребни ${totalDurationMins} минути, но од ова време се достапни само ${selection?.availableDurationMins ?? 0} минути.`,
                  )
                : undefined}
          </FieldError>
        </FieldSet>

        <Separator />

        <FieldGroup className="gap-4">
          <Field data-invalid={nameError}>
            <FieldLabel htmlFor="quick-customer-name">
              {t("Customer name", "Име на клиент")}
            </FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <UserRound />
              </InputGroupAddon>
              <InputGroupInput
                id="quick-customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder={t("Customer name", "Име на клиент")}
                maxLength={120}
                autoComplete="name"
                aria-invalid={nameError}
              />
            </InputGroup>
            <FieldError>
              {nameError
                ? t("Enter the customer name.", "Внесете го името на клиентот.")
                : undefined}
            </FieldError>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="quick-customer-phone">
                {t("Phone", "Телефон")}{" "}
                <span className="font-normal text-muted-foreground">
                  {t("Optional", "Опционално")}
                </span>
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Phone />
                </InputGroupAddon>
                <InputGroupInput
                  id="quick-customer-phone"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="+389…"
                  maxLength={40}
                  autoComplete="tel"
                />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="quick-customer-email">
                {t("Email", "Е-пошта")}{" "}
                <span className="font-normal text-muted-foreground">
                  {t("Optional", "Опционално")}
                </span>
              </FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <Mail />
                </InputGroupAddon>
                <InputGroupInput
                  id="quick-customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="name@example.com"
                  maxLength={254}
                  autoComplete="email"
                />
              </InputGroup>
            </Field>
          </div>
        </FieldGroup>
      </div>

      <DrawerFooter className="border-t border-border px-5 py-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-muted-foreground">
            {totalDurationMins > 0
              ? `${totalDurationMins} ${t("min", "мин")}`
              : t("No services selected", "Нема избрано услуги")}
          </span>
          <span className="font-semibold">
            {selectedCurrency && totalPriceMinorUnits > 0
              ? formatPrice(totalPriceMinorUnits, selectedCurrency, locale)
              : "—"}
          </span>
        </div>
        <Button type="submit" disabled={submitDisabled} size="lg">
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {isSubmitting
            ? t("Creating…", "Креирање…")
            : t("Create booking", "Креирај термин")}
        </Button>
      </DrawerFooter>
    </form>
  );
}
