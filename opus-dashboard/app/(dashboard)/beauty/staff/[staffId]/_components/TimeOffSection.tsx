"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
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
        `Remove the schedule change for ${formatDate(overrideDate)}?`,
      )
    ) {
      return;
    }

    try {
      await deleteOverride({ orgId, overrideId });
      toast.success("Schedule change removed.");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not remove schedule change"));
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!date) {
      toast.error("Choose a date.");
      return;
    }
    if (type === "custom_hours" && startTime >= endTime) {
      toast.error("The end time must be later than the start time.");
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
        type === "day_off" ? "Time off added." : "Special working hours added.",
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Could not save schedule change"));
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
              <CardTitle>Time off &amp; special hours</CardTitle>
              <CardDescription className="mt-1.5">
                Add one-off changes without editing the regular week.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openAddDialog}>
              <PlusIcon data-icon="inline-start" />
              Add change
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {overrides.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No upcoming changes
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Time off and special hours will appear here.
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
                        {formatDate(override.date)}
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
                          ? "Day off"
                          : "Special hours"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {override.type === "custom_hours"
                        ? `${override.startTime}–${override.endTime}`
                        : "Unavailable for bookings"}
                      {override.note ? ` · ${override.note}` : ""}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove schedule change for ${formatDate(override.date)}`}
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
            <DialogTitle>Add a schedule change</DialogTitle>
            <DialogDescription>
              Choose a day off or set different hours for one date.
            </DialogDescription>
          </DialogHeader>

          <form id="schedule-change-form" onSubmit={handleSave}>
            <FieldGroup className="gap-5 py-2">
              <Field>
                <FieldLabel htmlFor="schedule-change-date">Date</FieldLabel>
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
                <FieldLabel>What changes?</FieldLabel>
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
                  aria-label="Schedule change type"
                >
                  <ToggleGroupItem value="day_off" className="flex-1">
                    <CalendarOffIcon />
                    Day off
                  </ToggleGroupItem>
                  <ToggleGroupItem value="custom_hours" className="flex-1">
                    <Clock3Icon />
                    Special hours
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>

              {type === "custom_hours" && (
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/35 p-4">
                  <Field>
                    <FieldLabel htmlFor="special-start-time">
                      Start time
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
                    <FieldLabel htmlFor="special-end-time">End time</FieldLabel>
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
                  Note <span className="text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Input
                  id="schedule-change-note"
                  placeholder="Vacation, appointment, public holiday…"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <FieldDescription>
                  Only your team can see this note.
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
              Cancel
            </Button>
            <Button
              type="submit"
              form="schedule-change-form"
              disabled={isSaving}
            >
              {isSaving && <Spinner data-icon="inline-start" />}
              Save change
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

function formatDate(value: string) {
  return format(parseISO(value), "EEE, MMM d, yyyy");
}
