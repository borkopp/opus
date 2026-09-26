"use client";

import { useEffect, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { CalendarDays, ImagePlus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { ArtworkPreview } from "@/components/promotions/ArtworkPreview";
import { ArtworkPaletteEditor } from "@/components/promotions/ArtworkPaletteEditor";
import { usePromotionPalette } from "@/hooks/use-promotion-palette";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { bookingTimeLabel } from "@/lib/booking-wall-clock";
import { formatPrice } from "@/lib/format-price";
import { formatBookingDate } from "@/lib/public-booking-format";
import {
  openingBookingUrl,
  promotionTimestamp,
  validPromotionDate,
  type PromotionWorkspace,
  type PromotionOpening,
} from "@/lib/promotions";
import type { PromotionLanguage } from "@/convex/lib/promotionTemplates";
import { cn } from "@/lib/utils";

export function OpeningStory({
  data,
  language,
  initialDate,
  initialStaff,
  initialTime,
}: {
  data: PromotionWorkspace;
  language: PromotionLanguage;
  initialDate?: string | null;
  initialStaff?: string | null;
  initialTime?: string | null;
}) {
  const { t } = useDashboardI18n();
  const convex = useConvex();
  const [serviceId, setServiceId] = useState<
    PromotionWorkspace["services"][number]["id"] | undefined
  >(
    () =>
      (
        data.services.find((service) =>
          service.staffIds.some((id) => id === initialStaff),
        ) || data.services[0]
      )?.id,
  );
  const [staffId, setStaffId] = useState(
    () =>
      data.staff.find((staff) => staff.id === initialStaff)?.id ||
      ("any" as const),
  );
  const [date, setDate] = useState(() =>
    validPromotionDate(initialDate, data.today, data.maxDate),
  );
  const [startAt, setStartAt] = useState<number | undefined>(() =>
    promotionTimestamp(initialTime),
  );
  const [refreshMinute, setRefreshMinute] = useState(() =>
    Math.floor(Date.now() / 60_000),
  );
  useEffect(() => {
    const timer = setInterval(
      () => setRefreshMinute(Math.floor(Date.now() / 60_000)),
      30_000,
    );
    return () => clearInterval(timer);
  }, []);
  const service = data.services.find((item) => item.id === serviceId);
  const staff = data.staff.filter((person) =>
    service?.staffIds.includes(person.id),
  );
  const selectedStaff =
    staffId === "any" || staff.some((person) => person.id === staffId)
      ? staffId
      : "any";
  const queryArgs =
    service && data.published
      ? { serviceId: service.id, staffId: selectedStaff, date, refreshMinute }
      : null;
  const slots = useQuery(api.promotions.getOpenings, queryArgs || "skip");
  const selected = slots?.find((slot) => slot.startAt === startAt);
  return (
    <OpeningStoryEditor
      data={data}
      language={language}
      serviceId={service?.id}
      staffId={selectedStaff}
      date={date}
      slots={slots}
      selected={selected}
      onServiceChange={(id) => {
        setServiceId(data.services.find((item) => item.id === id)?.id);
        setStaffId("any");
        setStartAt(undefined);
      }}
      onStaffChange={(id) => {
        setStaffId(data.staff.find((person) => person.id === id)?.id || "any");
        setStartAt(undefined);
      }}
      onDateChange={(value) => {
        setDate(value);
        setStartAt(undefined);
      }}
      onSelect={setStartAt}
      beforeExport={async () => {
        if (!queryArgs || !selected)
          throw new Error(
            t(
              "Select an available appointment first.",
              "Прво изберете слободен термин.",
            ),
          );
        const fresh = await convex.query(api.promotions.getOpenings, {
          ...queryArgs,
          refreshMinute: Math.floor(Date.now() / 60_000),
        });
        if (
          !fresh.some(
            (slot) =>
              slot.startAt === selected.startAt &&
              slot.staffId === selected.staffId &&
              slot.priceMinorUnits === selected.priceMinorUnits,
          )
        )
          throw new Error(
            t(
              "This opening has changed. Select a current appointment before downloading.",
              "Овој термин се промени. Изберете достапен термин пред преземање.",
            ),
          );
      }}
    />
  );
}

export function OpeningStoryEditor({
  data,
  language,
  serviceId,
  staffId,
  date,
  slots,
  selected,
  onServiceChange,
  onStaffChange,
  onDateChange,
  onSelect,
  beforeExport,
}: {
  data: PromotionWorkspace;
  language: PromotionLanguage;
  serviceId?: string;
  staffId: string;
  date: string;
  slots?: PromotionOpening[];
  selected?: PromotionOpening;
  onServiceChange: (value: string) => void;
  onStaffChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSelect: (value: number) => void;
  beforeExport?: () => Promise<void>;
}) {
  const { t } = useDashboardI18n();
  const service = data.services.find((item) => item.id === serviceId);
  const staff = data.staff.filter((person) =>
    service?.staffIds.includes(person.id),
  );
  const mk = language === "mk";
  const [palette, setPalette] = usePromotionPalette(data.bookingUrl);
  return (
    <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex min-w-0 flex-col gap-7">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle data-replay-public>
              {t(
                "A free slot. A ready-to-share Story.",
                "Слободен термин. Story подготвено за споделување.",
              )}
            </CardTitle>
            <CardDescription data-replay-public>
              {t(
                "Choose a service and an available time. Your Story includes the current price and specialist.",
                "Изберете услуга и слободно време. Story ќе ги содржи тековната цена и специјалистот.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <FieldGroup>
              <Field>
                <FieldLabel data-replay-public htmlFor="story-service">
                  {t("Service", "Услуга")}
                </FieldLabel>
                <Select
                  value={serviceId || ""}
                  onValueChange={onServiceChange}
                  disabled={!data.published || !data.services.length}
                >
                  <SelectTrigger id="story-service" className="w-full">
                    <SelectValue
                      placeholder={t("Choose a service", "Изберете услуга")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data.services.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel data-replay-public htmlFor="story-staff">
                  {t("Specialist", "Специјалист")}
                </FieldLabel>
                <Select
                  value={staffId}
                  onValueChange={onStaffChange}
                  disabled={!data.published || !service}
                >
                  <SelectTrigger id="story-staff" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem data-replay-public value="any">
                        {t(
                          "Any available specialist",
                          "Кој било слободен специјалист",
                        )}
                      </SelectItem>
                      {staff.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel data-replay-public htmlFor="story-date">
                  {t("Date", "Датум")}
                </FieldLabel>
                <Input
                  id="story-date"
                  type="date"
                  value={date}
                  min={data.today}
                  max={data.maxDate}
                  disabled={!data.published}
                  onChange={(event) => onDateChange(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel data-replay-public>
                  {t("Available times", "Слободни термини")}
                </FieldLabel>
                {!data.published ? (
                  <p
                    data-replay-public
                    className="text-sm text-muted-foreground"
                  >
                    {t(
                      "Available after your website is published.",
                      "Достапно откако ќе ја објавите веб-страницата.",
                    )}
                  </p>
                ) : !service ? (
                  <p
                    data-replay-public
                    className="text-sm text-muted-foreground"
                  >
                    {t(
                      "Add a public service and assign a specialist first.",
                      "Прво додајте јавна услуга и назначете специјалист.",
                    )}
                  </p>
                ) : slots === undefined ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-11" />
                    ))}
                  </div>
                ) : slots.length === 0 ? (
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CalendarDays />
                      </EmptyMedia>
                      <EmptyTitle>
                        {t(
                          "No openings for this selection",
                          "Нема слободни термини за овој избор",
                        )}
                      </EmptyTitle>
                      <EmptyDescription>
                        {t(
                          "Try another date, service, or specialist.",
                          "Пробајте друг датум, услуга или специјалист.",
                        )}
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <div
                    className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto p-1 sm:grid-cols-4"
                    role="group"
                    aria-label={t("Available times", "Слободни термини")}
                  >
                    {slots.map((slot) => (
                      <button
                        type="button"
                        key={slot.startAt}
                        aria-pressed={selected?.startAt === slot.startAt}
                        onClick={() => onSelect(slot.startAt)}
                        className={cn(
                          "min-h-11 rounded-xl border px-2 py-2 text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                          selected?.startAt === slot.startAt
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-accent",
                        )}
                      >
                        {bookingTimeLabel(slot.startAt)}
                      </button>
                    ))}
                  </div>
                )}
              </Field>
            </FieldGroup>
            <p
              data-replay-public
              className="mt-6 text-sm leading-relaxed text-muted-foreground"
            >
              {t(
                "Download the image, add it to your Instagram Story, then paste the booking link into a Link sticker. Sharing does not reserve the appointment.",
                "Преземете ја сликата, додајте ја во Instagram Story и залепете го линкот за закажување во налепницата Link. Споделувањето не го резервира терминот.",
              )}
            </p>
          </CardContent>
        </Card>
        <ArtworkPaletteEditor
          palette={palette}
          kind="opening"
          onChange={setPalette}
        />
      </div>
      {selected && service ? (
        <ArtworkPreview
          palette={palette}
          artwork={{
            kind: "opening",
            language,
            name: data.name,
            address: data.address,
            bookingUrl: openingBookingUrl(
              data.bookingUrl,
              service.id,
              selected,
            ),
            opening: {
              service: service.name,
              specialist:
                data.staff.find((person) => person.id === selected.staffId)
                  ?.name || "",
              time: bookingTimeLabel(selected.startAt),
              date: mk
                ? formatBookingDate(selected.startAt)
                : new Intl.DateTimeFormat("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(selected.startAt),
              price: formatPrice(
                selected.priceMinorUnits,
                selected.currency,
                mk ? "mk-MK" : "en-GB",
                selected.priceMinorUnits % 100 !== 0,
              ),
              duration: `${service.durationMins} ${mk ? "мин" : "min"}`,
            },
          }}
          filename={`${data.slug}-opening-${date}-${bookingTimeLabel(selected.startAt).replace(":", "")}`}
          beforeExport={beforeExport}
        />
      ) : (
        <Empty className="min-h-80 rounded-3xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImagePlus />
            </EmptyMedia>
            <EmptyTitle>
              {t(
                "Your Story starts with an opening",
                "Вашето Story почнува со слободен термин",
              )}
            </EmptyTitle>
            <EmptyDescription>
              {t(
                "Select a time to preview the image your clients will see.",
                "Изберете време за да ја видите сликата што ќе ја споделите со клиентите.",
              )}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  );
}
