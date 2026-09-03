"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { enGB, mk } from "date-fns/locale";
import {
  CalendarOffIcon,
  Clock3Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/file-validation";

type ScheduleChangeType = "day_off" | "custom_hours";

export function TimeOffSection({
  orgId,
  staffId,
}: {
  orgId: Id<"orgs">;
  staffId: Id<"staff_members">;
}) {
  const { language, t } = useDashboardI18n();
  const [today] = useState(getLocalDate);
  const overrides = useQuery(api.availabilityOverrides.listOverrides, {
    orgId,
    staffId,
    fromDate: today,
  });
  const deleteOverride = useMutation(api.availabilityOverrides.deleteOverride);
  const createOverride = useMutation(api.availabilityOverrides.createOverride);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [type, setType] = useState<ScheduleChangeType>("day_off");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (overrides === undefined) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const openAddDialog = () => {
    setDate(today);
    setType("day_off");
    setStartTime("09:00");
    setEndTime("17:00");
    setNote("");
    setIsAddOpen(true);
  };

  const handleDelete = async (
    overrideId: Id<"availability_overrides">,
    overrideDate: string,
  ) => {
    if (
      !window.confirm(
        t(
          `Remove the schedule change for ${formatDate(overrideDate, language)}?`,
          `Дали сакате да ја отстраните промената на распоредот за ${formatDate(overrideDate, language)}?`,
        ),
      )
    ) {
      return;
    }

    try {
      await deleteOverride({ orgId, overrideId });
      toast.success(
        t("Schedule change removed.", "Промената на распоредот е отстранета."),
      );
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          t(
            "Could not remove schedule change",
            "Не може да се отстрани промената на распоредот",
          ),
        ),
      );
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!date) {
      toast.error(t("Choose a date.", "Изберете датум."));
      return;
    }
    if (type === "custom_hours" && startTime >= endTime) {
      toast.error(
        t(
          "The end time must be later than the start time.",
          "Крајното време мора да биде после почетното време.",
        ),
      );
      return;
    }

    setIsSaving(true);
    try {
      await createOverride({
        orgId,
        staffId,
        date,
        type,
        startTime: type === "custom_hours" ? startTime : undefined,
        endTime: type === "custom_hours" ? endTime : undefined,
        note: note.trim() || undefined,
      });
      setIsAddOpen(false);
      toast.success(
        type === "day_off"
          ? t("Time off added.", "Отсуството е додадено.")
          : t(
              "Special working hours added.",
              "Специјалното работно време е додадено.",
            ),
      );
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          t(
            "Could not save schedule change",
            "Не може да се зачува промената на распоредот",
          ),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card className="w-full overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>
                {t(
                  "Time off & special hours",
                  "Отсуства и специјално работно време",
                )}
              </CardTitle>
              <CardDescription className="mt-1.5">
                {t(
                  "Add one-off changes without editing the regular week.",
                  "Додајте еднократни промени без да го менувате редовниот неделен распоред.",
                )}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <PlusIcon data-icon="inline-start" />
              {t("Add change", "Додај промена")}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {overrides.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                {t("No upcoming changes", "Нема претстојни промени")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "Time off and special hours will appear here.",
                  "Отсуствата и специјалното работно време ќе се прикажат тука.",
                )}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {overrides.map((override) => (
                <div
                  key={override._id}
                  className="flex items-center gap-3 px-4 py-4 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">
                        {formatDate(override.date, language)}
                      </p>
                      <Badge
                        variant={
                          override.type === "day_off" ? "danger" : "highlight"
                        }
                      >
                        {override.type === "day_off" ? (
                          <CalendarOffIcon />
                        ) : (
                          <Clock3Icon />
                        )}
                        {override.type === "day_off"
                          ? t("Day off", "Слободен ден")
                          : t("Special hours", "Специјално работно време")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {override.type === "custom_hours"
                        ? `${override.startTime}–${override.endTime}`
                        : t(
                            "Unavailable for bookings",
                            "Не е достапен за закажувања",
                          )}
                      {override.note ? ` · ${override.note}` : ""}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t(
                      `Remove schedule change for ${formatDate(override.date, language)}`,
                      `Отстрани ја промената на распоредот за ${formatDate(override.date, language)}`,
                    )}
                    onClick={() => handleDelete(override._id, override.date)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("Add a schedule change", "Додај промена на распоред")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Choose a day off or set different hours for one date.",
                "Изберете слободен ден или поставете поинакво работно време за одреден датум.",
              )}
            </DialogDescription>
          </DialogHeader>

          <form id="schedule-change-form" onSubmit={handleSave}>
            <FieldGroup className="gap-5 py-2">
              <Field>
                <FieldLabel htmlFor="schedule-change-date">
                  {t("Date", "Датум")}
                </FieldLabel>
                <Input
                  id="schedule-change-date"
                  type="date"
                  min={today}
                  required
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>{t("What changes?", "Што се менува?")}</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={2}
                  value={type}
                  onValueChange={(value) => {
                    if (value === "day_off" || value === "custom_hours") {
                      setType(value);
                    }
                  }}
                  className="w-full"
                  aria-label={t(
                    "Schedule change type",
                    "Тип на промена на распоред",
                  )}
                >
                  <ToggleGroupItem value="day_off" className="flex-1">
                    <CalendarOffIcon />
                    {t("Day off", "Слободен ден")}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="custom_hours" className="flex-1">
                    <Clock3Icon />
                    {t("Special hours", "Специјално работно време")}
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              {type === "custom_hours" && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/35 p-4">
                  <Field>
                    <FieldLabel htmlFor="special-start-time">
                      {t("Start time", "Почетно време")}
                    </FieldLabel>
                    <Input
                      id="special-start-time"
                      type="time"
                      required
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="special-end-time">
                      {t("End time", "Крајно време")}
                    </FieldLabel>
                    <Input
                      id="special-end-time"
                      type="time"
                      required
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                    />
                  </Field>
                </div>
              )}

              <Field>
                <FieldLabel htmlFor="schedule-change-note">
                  {t("Note", "Забелешка")}{" "}
                  <span className="text-muted-foreground">
                    ({t("optional", "опционално")})
                  </span>
                </FieldLabel>
                <Input
                  id="schedule-change-note"
                  placeholder={t(
                    "Vacation, appointment, public holiday…",
                    "Одмор, термин, државен празник…",
                  )}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <FieldDescription>
                  {t(
                    "Only your team can see this note.",
                    "Само вашиот тим може да ја види оваа забелешка.",
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              disabled={isSaving}
            >
              {t("Cancel", "Откажи")}
            </Button>
            <Button
              type="submit"
              form="schedule-change-form"
              disabled={isSaving}
            >
              {isSaving && <Spinner data-icon="inline-start" />}
              {isSaving
                ? t("Saving…", "Се зачувува…")
                : t("Save change", "Зачувај промена")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getLocalDate() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function formatDate(value: string, language: "en" | "mk") {
  const dateLocale = language === "mk" ? mk : enGB;
  const formatPattern =
    language === "mk" ? "EEE, d MMM yyyy" : "EEE, MMM d, yyyy";
  return format(parseISO(value), formatPattern, { locale: dateLocale });
}
