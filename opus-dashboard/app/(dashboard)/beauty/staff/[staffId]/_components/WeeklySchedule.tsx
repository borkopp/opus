"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  CoffeeIcon,
  CopyIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getErrorMessage } from "@/lib/file-validation";
import { cn } from "@/lib/utils";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function getDayLabel(dayOfWeek: number, t: (en: string, mk: string) => string) {
  switch (dayOfWeek) {
    case 1:
      return t("Monday", "Понеделник");
    case 2:
      return t("Tuesday", "Вторник");
    case 3:
      return t("Wednesday", "Среда");
    case 4:
      return t("Thursday", "Четврток");
    case 5:
      return t("Friday", "Петок");
    case 6:
      return t("Saturday", "Сабота");
    case 0:
      return t("Sunday", "Недела");
    default:
      return t("Day", "Ден");
  }
}

type BreakTime = {
  startTime: string;
  endTime: string;
};

type DraftDay = {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
  breaks: BreakTime[];
};

type ScheduleState = {
  staffId: Id<"staff_members">;
  baseline: DraftDay[];
  draft: DraftDay[];
};

export function WeeklySchedule({
  orgId,
  staffId,
}: {
  orgId: Id<"orgs">;
  staffId: Id<"staff_members">;
}) {
  const { t } = useDashboardI18n();
  const weeklySchedule = useQuery(api.availability.getWeeklySchedule, {
    orgId,
    staffId,
  });
  const staff = useQuery(api.staff.listStaffMembers, { orgId });
  const setAvailabilityRule = useMutation(api.availability.setAvailabilityRule);
  const copyScheduleToAllStaff = useMutation(
    api.availability.copyScheduleToAllStaff,
  );

  const [scheduleState, setScheduleState] = useState<ScheduleState | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (weeklySchedule === undefined) return;

    const nextSchedule = cloneSchedule(weeklySchedule);
    setScheduleState((current) => {
      if (current === null || current.staffId !== staffId) {
        return {
          staffId,
          baseline: nextSchedule,
          draft: cloneSchedule(nextSchedule),
        };
      }

      if (schedulesMatch(current.baseline, current.draft)) {
        return {
          staffId,
          baseline: nextSchedule,
          draft: cloneSchedule(nextSchedule),
        };
      }

      return current;
    });
  }, [staffId, weeklySchedule]);

  if (
    weeklySchedule === undefined ||
    scheduleState === null ||
    scheduleState.staffId !== staffId
  ) {
    return <Skeleton className="h-[620px] w-full rounded-xl" />;
  }

  const hasChanges = !schedulesMatch(
    scheduleState.baseline,
    scheduleState.draft,
  );
  const orderedDraft = DAY_ORDER.map((dayOfWeek) =>
    scheduleState.draft.find((day) => day.dayOfWeek === dayOfWeek),
  ).filter((day): day is DraftDay => day !== undefined);

  const updateDay = (
    dayOfWeek: number,
    updates: Partial<Omit<DraftDay, "dayOfWeek">>,
  ) => {
    setScheduleState((current) => {
      if (current === null) return current;

      return {
        ...current,
        draft: current.draft.map((day) =>
          day.dayOfWeek === dayOfWeek ? { ...day, ...updates } : day,
        ),
      };
    });
  };

  const handleSave = async () => {
    const validationError = getScheduleValidationError(scheduleState.draft, t);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const changedDays = scheduleState.draft.filter((day) => {
      const baselineDay = scheduleState.baseline.find(
        (candidate) => candidate.dayOfWeek === day.dayOfWeek,
      );
      return baselineDay === undefined || !daysMatch(day, baselineDay);
    });
    if (changedDays.length === 0) return;

    setIsSaving(true);
    try {
      await Promise.all(
        changedDays.map((day) =>
          setAvailabilityRule({
            orgId,
            staffId,
            dayOfWeek: day.dayOfWeek,
            startTime: day.startTime,
            endTime: day.endTime,
            breaks: day.breaks,
            isActive: day.isActive,
          }),
        ),
      );

      setScheduleState((current) =>
        current
          ? { ...current, baseline: cloneSchedule(current.draft) }
          : current,
      );
      toast.success(
        t("Regular hours saved.", "Редовното работно време е зачувано."),
      );
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          t(
            "Could not save regular hours",
            "Не може да се зачува редовното работно време",
          ),
        ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToAll = async () => {
    if (hasChanges) {
      toast.error(
        t(
          "Save these hours before applying them to the team.",
          "Зачувајте ги овие часови пред да ги примените на тимот.",
        ),
      );
      return;
    }

    if (
      !window.confirm(
        t(
          "Apply these regular hours to every other staff member? Their current regular hours will be replaced.",
          "Дали сакате да го примените ова редовно работно време на сите останати вработени? Нивното тековно работно време ќе биде заменето.",
        ),
      )
    ) {
      return;
    }

    setIsCopying(true);
    try {
      await copyScheduleToAllStaff({ orgId, sourceStaffId: staffId });
      toast.success(
        t(
          "Regular hours applied to the whole team.",
          "Редовното работно време е применето на целиот тим.",
        ),
      );
    } catch (error: unknown) {
      toast.error(
        getErrorMessage(
          error,
          t(
            "Could not apply hours to the team",
            "Не може да се примени работното време на тимот",
          ),
        ),
      );
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("Regular hours", "Редовно работно време")}</CardTitle>
            <CardDescription className="mt-1.5">
              {t(
                "Customers can only book this team member during these hours.",
                "Клиентите можат да закажуваат кај овој член на тимот само во ова работно време.",
              )}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {staff && staff.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t(
                      "More schedule actions",
                      "Повеќе опции за распоредот",
                    )}
                  >
                    <MoreHorizontalIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      disabled={isCopying}
                      onSelect={() => void handleCopyToAll()}
                    >
                      {isCopying ? <Spinner /> : <CopyIcon />}
                      {t(
                        "Apply saved hours to all staff",
                        "Примени зачувано работно време на сите вработени",
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              size="sm"
              disabled={!hasChanges || isSaving}
              onClick={handleSave}
            >
              {isSaving ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <SaveIcon data-icon="inline-start" />
              )}
              {isSaving
                ? t("Saving…", "Се зачувува…")
                : t("Save changes", "Зачувај промени")}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y">
          {orderedDraft.map((day) => {
            const dayLabel = getDayLabel(day.dayOfWeek, t);

            return (
              <DayRow
                key={day.dayOfWeek}
                day={day}
                dayLabel={dayLabel}
                onChange={(updates) => updateDay(day.dayOfWeek, updates)}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DayRow({
  day,
  dayLabel,
  onChange,
}: {
  day: DraftDay;
  dayLabel: string;
  onChange: (updates: Partial<Omit<DraftDay, "dayOfWeek">>) => void;
}) {
  const { t } = useDashboardI18n();

  const updateBreak = (
    index: number,
    field: "startTime" | "endTime",
    value: string,
  ) => {
    const nextBreaks = day.breaks.map((breakItem, breakIndex) =>
      breakIndex === index ? { ...breakItem, [field]: value } : breakItem,
    );
    onChange({ breaks: nextBreaks });
  };

  const addBreak = () => {
    if (day.breaks.length >= 3) return;
    onChange({
      breaks: [...day.breaks, { startTime: "12:00", endTime: "13:00" }],
    });
  };

  const removeBreak = (index: number) => {
    onChange({
      breaks: day.breaks.filter((_, breakIndex) => breakIndex !== index),
    });
  };

  return (
    <div
      className={cn(
        "grid gap-4 px-4 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:px-5",
        !day.isActive && "bg-muted/20",
      )}
    >
      <div className="flex items-center gap-3 self-start sm:min-h-9">
        <Switch
          id={`working-${day.dayOfWeek}`}
          checked={day.isActive}
          onCheckedChange={(isActive) => onChange({ isActive })}
          aria-label={t(
            `Set ${dayLabel} as a working day`,
            `Постави го ${dayLabel} како работен ден`,
          )}
        />
        <Label htmlFor={`working-${day.dayOfWeek}`} className="font-medium">
          {dayLabel}
        </Label>
      </div>

      {day.isActive ? (
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={`start-${day.dayOfWeek}`} className="sr-only">
              {t(`${dayLabel} start time`, `Почетно време за ${dayLabel}`)}
            </Label>
            <Input
              id={`start-${day.dayOfWeek}`}
              type="time"
              value={day.startTime}
              onChange={(event) => onChange({ startTime: event.target.value })}
              className="w-[8.5rem] tabular-nums"
            />
            <span className="text-sm text-muted-foreground">
              {t("to", "до")}
            </span>
            <Label htmlFor={`end-${day.dayOfWeek}`} className="sr-only">
              {t(`${dayLabel} end time`, `Крајно време за ${dayLabel}`)}
            </Label>
            <Input
              id={`end-${day.dayOfWeek}`}
              type="time"
              value={day.endTime}
              onChange={(event) => onChange({ endTime: event.target.value })}
              className="w-[8.5rem] tabular-nums"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addBreak}
              disabled={day.breaks.length >= 3}
            >
              <PlusIcon data-icon="inline-start" />
              {t("Add break", "Додај пауза")}
            </Button>
          </div>

          {day.breaks.length > 0 && (
            <div className="flex flex-col gap-2">
              {day.breaks.map((breakItem, index) => (
                <div
                  key={index}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/45 px-3 py-2"
                >
                  <CoffeeIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="mr-1 text-xs font-medium text-muted-foreground">
                    {t("Break", "Пауза")}
                  </span>
                  <Label
                    htmlFor={`break-start-${day.dayOfWeek}-${index}`}
                    className="sr-only"
                  >
                    {t(
                      `${dayLabel} break start time`,
                      `Почетно време на пауза за ${dayLabel}`,
                    )}
                  </Label>
                  <Input
                    id={`break-start-${day.dayOfWeek}-${index}`}
                    type="time"
                    value={breakItem.startTime}
                    onChange={(event) =>
                      updateBreak(index, "startTime", event.target.value)
                    }
                    className="w-[8.5rem] bg-card tabular-nums"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("to", "до")}
                  </span>
                  <Label
                    htmlFor={`break-end-${day.dayOfWeek}-${index}`}
                    className="sr-only"
                  >
                    {t(
                      `${dayLabel} break end time`,
                      `Крајно време на пауза за ${dayLabel}`,
                    )}
                  </Label>
                  <Input
                    id={`break-end-${day.dayOfWeek}-${index}`}
                    type="time"
                    value={breakItem.endTime}
                    onChange={(event) =>
                      updateBreak(index, "endTime", event.target.value)
                    }
                    className="w-[8.5rem] bg-card tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t(
                      `Remove ${dayLabel} break ${index + 1}`,
                      `Отстрани ја паузата ${index + 1} за ${dayLabel}`,
                    )}
                    onClick={() => removeBreak(index)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="self-center text-sm text-muted-foreground">
          {t("Not available for bookings", "Не е достапен за закажувања")}
        </p>
      )}
    </div>
  );
}

function cloneSchedule(schedule: DraftDay[]): DraftDay[] {
  return schedule.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    isActive: day.isActive,
    startTime: day.startTime,
    endTime: day.endTime,
    breaks: day.breaks.map((breakItem) => ({ ...breakItem })),
  }));
}

function daysMatch(first: DraftDay, second: DraftDay) {
  return (
    first.dayOfWeek === second.dayOfWeek &&
    first.isActive === second.isActive &&
    first.startTime === second.startTime &&
    first.endTime === second.endTime &&
    JSON.stringify(first.breaks) === JSON.stringify(second.breaks)
  );
}

function schedulesMatch(first: DraftDay[], second: DraftDay[]) {
  return (
    first.length === second.length &&
    first.every((day) => {
      const matchingDay = second.find(
        (candidate) => candidate.dayOfWeek === day.dayOfWeek,
      );
      return matchingDay !== undefined && daysMatch(day, matchingDay);
    })
  );
}

function getScheduleValidationError(
  schedule: DraftDay[],
  t: (en: string, mk: string) => string,
) {
  for (const day of schedule) {
    if (!day.isActive) continue;

    const dayLabel = getDayLabel(day.dayOfWeek, t);
    if (!day.startTime || !day.endTime || day.startTime >= day.endTime) {
      return t(
        `${dayLabel}'s end time must be later than its start time.`,
        `Крајното време за ${dayLabel} мора да биде после почетното време.`,
      );
    }

    for (const breakItem of day.breaks) {
      if (
        !breakItem.startTime ||
        !breakItem.endTime ||
        breakItem.startTime >= breakItem.endTime
      ) {
        return t(
          `${dayLabel} has a break with invalid times.`,
          `${dayLabel} има пауза со невалидно време.`,
        );
      }

      if (
        breakItem.startTime < day.startTime ||
        breakItem.endTime > day.endTime
      ) {
        return t(
          `${dayLabel}'s breaks must be inside its working hours.`,
          `Паузите за ${dayLabel} мора да бидат во рамките на работното време.`,
        );
      }
    }
  }

  return null;
}
