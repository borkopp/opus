"use client";

import { useState } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { reservationTime } from "@/lib/reservation-format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ReservationError, ReservationInput } from "../ReservationFields";

export function FloorPlanWalkInDialog({
  table,
  settings,
  refreshKey,
  onClose,
  onSeated,
}: {
  table: Doc<"tables">;
  settings: Doc<"reservation_settings">;
  refreshKey: number;
  onClose: () => void;
  onSeated: () => void;
}) {
  const { t, locale } = useDashboardI18n();
  const copy = useReservationCopy();
  const { isWebSocketConnected } = useConvexConnectionState();
  const seat = useMutation(api.reservations.seatWalkIn);
  const action = useReservationAction();
  const [party, setParty] = useState(
    String(Math.min(settings.maxPartySize, Math.max(settings.minPartySize, 2))),
  );
  const [duration, setDuration] = useState(
    String(settings.defaultDurationMins),
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [selection, setSelection] = useState("");
  const [retry, setRetry] = useState(0);
  const partySize = Number(party);
  const durationMins = Number(duration);
  const valid =
    Number.isInteger(partySize) &&
    partySize >= settings.minPartySize &&
    partySize <= settings.maxPartySize &&
    Number.isInteger(durationMins) &&
    durationMins >= settings.minDurationMins &&
    durationMins <= settings.maxDurationMins;
  const availability = useQuery(
    api.reservations.getWalkInOptions,
    valid
      ? {
          tableId: table._id,
          partySize,
          durationMins,
          refreshKey: refreshKey + retry,
        }
      : "skip",
  );
  const keyFor = (ids: readonly string[]) => [...ids].sort().join(",");
  // Latch the sole choice. A query refresh must not change the operation ID.
  if (!selection && availability?.options.length === 1)
    setSelection(keyFor(availability.options[0].tableIds));
  const option = availability?.options.find(
    (row) => keyFor(row.tableIds) === selection,
  );
  // Keep an operation identity across network retries; changed guest inputs are a new intent.
  const intent = JSON.stringify([
    table._id,
    partySize,
    durationMins,
    selection,
    name.trim(),
    phone.trim(),
    note.trim(),
  ]);
  const [request, setRequest] = useState(() => ({
    intent,
    id: crypto.randomUUID(),
  }));
  if (request.intent !== intent)
    setRequest({ intent, id: crypto.randomUUID() });

  async function save() {
    if (!option || !valid || action.busy || !isWebSocketConnected) return;
    const result = await action.run(
      () =>
        seat({
          requestId: request.id,
          tableIds: option.tableIds,
          partySize,
          durationMins,
          customerName: name.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          specialRequests: note.trim() || undefined,
        }),
      t("Walk-in seated", "Гостите се сместени", "Mysafirët u ulën"),
    );
    if (result) {
      onSeated();
      onClose();
    } else setRetry((value) => value + 1);
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              "Seat a walk-in",
              "Смести гости без резервација",
              "Ul mysafirë pa rezervim",
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              `Start a visit now at ${table.label}, or use one of its saved table combinations.`,
              `Започнете посета сега на ${table.label}, или користете зачувана комбинација со оваа маса.`,
              `Filloni një vizitë tani në ${table.label}, ose përdorni një kombinim të ruajtur me këtë tavolinë.`,
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="flex min-w-0 flex-col gap-5"
        >
          <fieldset disabled={action.busy} className="min-w-0 space-y-5">
            <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ReservationInput
                label={copy("Party size")}
                type="number"
                inputMode="numeric"
                min={settings.minPartySize}
                max={settings.maxPartySize}
                required
                value={party}
                onChange={(event) => {
                  setParty(event.target.value);
                  setSelection("");
                }}
                autoFocus
              />
              <ReservationInput
                label={copy("Dining duration (minutes)")}
                type="number"
                inputMode="numeric"
                min={settings.minDurationMins}
                max={settings.maxDurationMins}
                required
                value={duration}
                onChange={(event) => {
                  setDuration(event.target.value);
                  setSelection("");
                }}
              />
            </FieldGroup>
            <fieldset className="min-w-0 space-y-2">
              <legend className="mb-2 text-sm font-medium">
                {t(
                  "Available tables now",
                  "Достапни маси сега",
                  "Tavolinat e lira tani",
                )}
              </legend>
              {!valid ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Enter a party size and duration within your venue’s limits.",
                    "Внесете број на гости и времетраење во границите на локалот.",
                    "Vendosni madhësinë e grupit dhe kohëzgjatjen brenda kufijve të lokalit.",
                  )}
                </p>
              ) : !availability ? (
                <Skeleton className="h-20" />
              ) : availability.options.length === 0 ? (
                <p
                  role="status"
                  className="rounded-xl border bg-muted/30 p-3 text-sm"
                >
                  {availability.reason
                    ? copy(availability.reason)
                    : t(
                        "No table option fits this visit. Try a shorter duration or another table.",
                        "Нема соодветни маси за посетата. Обидете се со пократко времетраење или друга маса.",
                        "Asnjë tavolinë nuk përshtatet për këtë vizitë. Provoni kohëzgjatje më të shkurtër ose tavolinë tjetër.",
                      )}
                </p>
              ) : (
                availability.options.map((row) => {
                  const selected =
                    option && keyFor(row.tableIds) === keyFor(option.tableIds);
                  return (
                    <label
                      key={keyFor(row.tableIds)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-3 hover:bg-muted/40",
                        selected && "border-primary bg-primary/5",
                      )}
                    >
                      <input
                        type="radio"
                        name="walk-in-tables"
                        value={keyFor(row.tableIds)}
                        checked={Boolean(selected)}
                        onChange={() => setSelection(keyFor(row.tableIds))}
                        className="size-4 shrink-0 accent-primary"
                      />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-sm font-medium [overflow-wrap:anywhere]">
                          {row.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {row.minPartySize}–{row.capacity} {copy("guests")}
                          {row.tableIds.length > 1
                            ? ` · ${t("Saved combination", "Зачувана комбинација", "Kombinim i ruajtur")}`
                            : ""}
                        </span>
                      </span>
                    </label>
                  );
                })
              )}
              {option && availability?.endAt && (
                <p className="text-xs text-muted-foreground">
                  {t(
                    `Seated now · Expected finish ${reservationTime(availability.endAt, availability.timezone, locale)}. Availability is checked again when you seat the party.`,
                    `Сместување сега · Очекуван крај ${reservationTime(availability.endAt, availability.timezone, locale)}. Достапноста повторно се проверува при сместувањето.`,
                    `Ulje tani · Përfundimi i pritshëm ${reservationTime(availability.endAt, availability.timezone, locale)}. Disponueshmëria kontrollohet përsëri kur ulni grupin.`,
                  )}
                </p>
              )}
            </fieldset>
            <FieldGroup>
              <ReservationInput
                label={t(
                  "Guest name (optional)",
                  "Име на гостин (опционално)",
                  "Emri i mysafirit (opsional)",
                )}
                autoComplete="name"
                maxLength={120}
                placeholder={t(
                  "Walk-in guest",
                  "Гостин без резервација",
                  "Mysafir pa rezervim",
                )}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <ReservationInput
                label={t(
                  "Phone (optional)",
                  "Телефон (опционално)",
                  "Telefoni (opsional)",
                )}
                type="tel"
                autoComplete="tel"
                maxLength={40}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <ReservationInput
                label={t(
                  "Visit notes (optional)",
                  "Белешки за посетата (опционално)",
                  "Shënime për vizitën (opsionale)",
                )}
                maxLength={1000}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </FieldGroup>
          </fieldset>
          {!isWebSocketConnected && (
            <p role="status" className="text-sm text-muted-foreground">
              {t(
                "Reconnecting… Seating will be available when live service is connected.",
                "Повторно поврзување… Сместувањето ќе биде достапно кога ќе се воспостави врската.",
                "Duke u rilidhur… Ulja do të jetë e disponueshme kur shërbimi të lidhet.",
              )}
            </p>
          )}
          <ReservationError error={action.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={onClose}
            >
              {copy("Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                !valid ||
                !option ||
                !availability ||
                action.busy ||
                !isWebSocketConnected
              }
            >
              {action.busy
                ? t("Seating…", "Се сместуваат…", "Duke ulur…")
                : t(
                    "Seat guests now",
                    "Смести ги гостите сега",
                    "Ul mysafirët tani",
                  )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
