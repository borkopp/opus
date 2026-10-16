"use client";

import { useId, useState } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  ReservationError,
  ReservationInput,
  ReservationSelect,
} from "./ReservationFields";
import type { StaffReservation } from "./ReservationEditDialog";

const assignmentKey = (ids: readonly string[]) => [...ids].sort().join(",");

export function ReservationAmendDialog({
  reservation,
  onClose,
}: {
  reservation: StaffReservation;
  onClose: () => void;
}) {
  const { t } = useDashboardI18n();
  const copy = useReservationCopy();
  const noteId = useId();
  const action = useReservationAction();
  const amend = useMutation(api.reservations.amend);
  const { isWebSocketConnected } = useConvexConnectionState();
  const [baseline, setBaseline] = useState(reservation);
  const [name, setName] = useState(reservation.customerName);
  const [email, setEmail] = useState(reservation.customerEmail ?? "");
  const [phone, setPhone] = useState(reservation.customerPhone ?? "");
  const [party, setParty] = useState(String(reservation.partySize));
  const [note, setNote] = useState(reservation.specialRequests ?? "");
  const [assignment, setAssignment] = useState(
    assignmentKey(reservation.tableIds ?? [reservation.tableId]),
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const current = useQuery(api.reservations.get, {
    reservationId: reservation._id,
  });
  const partySize = Number(party);
  const partyChanged = partySize !== baseline.partySize;
  const partyValid =
    Number.isInteger(partySize) && partySize >= 1 && partySize <= 100;
  const choices = useQuery(
    api.reservations.getAmendOptions,
    partyChanged && partyValid
      ? { reservationId: reservation._id, partySize, refreshKey }
      : "skip",
  );
  const selected = choices?.options.find(
    (option) => assignmentKey(option.tableIds) === assignment,
  );
  const stale = Boolean(current && current.revision !== baseline.revision);
  const unavailable = Boolean(
    current &&
    (current.guestErased || !["confirmed", "seated"].includes(current.status)),
  );
  const fields = {
    ...(name.trim() !== baseline.customerName
      ? { customerName: name.trim() }
      : {}),
    ...(email.trim().toLowerCase() !==
    (baseline.customerEmail ?? "").trim().toLowerCase()
      ? { customerEmail: email.trim().toLowerCase() }
      : {}),
    ...(phone.trim() !== (baseline.customerPhone ?? "")
      ? { customerPhone: phone.trim() }
      : {}),
    ...(note.trim() !== (baseline.specialRequests ?? "")
      ? { specialRequests: note.trim() }
      : {}),
    ...(partyChanged ? { partySize } : {}),
  };
  const dirty = Object.keys(fields).length > 0;
  const blocked =
    !current ||
    stale ||
    unavailable ||
    !isWebSocketConnected ||
    !partyValid ||
    (partyChanged &&
      (!choices || !selected || choices.revision !== baseline.revision));

  function reload() {
    if (!current || unavailable) return;
    setBaseline(current);
    setName(current.customerName);
    setEmail(current.customerEmail ?? "");
    setPhone(current.customerPhone ?? "");
    setParty(String(current.partySize));
    setNote(current.specialRequests ?? "");
    setAssignment(assignmentKey(current.tableIds ?? [current.tableId]));
    setRefreshKey((value) => value + 1);
  }
  async function save() {
    if (action.busy || blocked || !dirty) return;
    const result = await action.run(
      () =>
        amend({
          reservationId: baseline._id,
          expectedRevision: baseline.revision ?? 0,
          ...fields,
          ...(partyChanged && selected ? { tableIds: selected.tableIds } : {}),
        }),
      t(
        "Guest and party updated",
        "Гостинот и групата се ажурирани",
        "Mysafiri dhe grupi u përditësuan",
      ),
    );
    if (result) onClose();
    else setRefreshKey((value) => value + 1);
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
              "Edit guest & party",
              "Уреди гостин и група",
              "Redakto mysafirin dhe grupin",
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Update the details for this reservation. A larger or smaller party may need a different table or saved combination.",
              "Ажурирајте ги податоците за оваа резервација. Поголема или помала група може да бара друга маса или зачувана комбинација.",
              "Përditësoni të dhënat për këtë rezervim. Një grup më i madh ose më i vogël mund të kërkojë tavolinë tjetër ose kombinim të ruajtur.",
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
          {unavailable ? (
            <Alert>
              <AlertDescription>
                {t(
                  "This reservation can no longer be edited. It may have finished, been cancelled, or had its guest details anonymized.",
                  "Оваа резервација повеќе не може да се уредува. Можеби е завршена, откажана или податоците за гостинот се анонимизирани.",
                  "Ky rezervim nuk mund të redaktohet më. Mund të ketë përfunduar, të jetë anuluar ose të dhënat e mysafirit të jenë anonimizuar.",
                )}
              </AlertDescription>
            </Alert>
          ) : (
            stale && (
              <Alert>
                <AlertDescription className="flex flex-col items-start gap-2">
                  {t(
                    "This reservation changed while you were editing. Reload the latest details before saving. Reloading replaces your draft.",
                    "Резервацијата се промени додека уредувавте. Вчитајте ги најновите податоци пред зачувување. Ова ќе ги замени вашите незачувани промени.",
                    "Rezervimi ndryshoi gjatë redaktimit. Ringarkoni të dhënat e fundit para ruajtjes. Ringarkimi zëvendëson ndryshimet tuaja të paruajtura.",
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={action.busy}
                    onClick={reload}
                  >
                    {t(
                      "Reload latest details",
                      "Вчитај најнови податоци",
                      "Ringarko të dhënat e fundit",
                    )}
                  </Button>
                </AlertDescription>
              </Alert>
            )
          )}
          <fieldset
            disabled={action.busy || unavailable}
            className="min-w-0 space-y-5"
          >
            <FieldGroup>
              <ReservationInput
                label={copy("Guest name")}
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
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
                    "Email (optional)",
                    "Е-пошта (опционално)",
                    "Email-i (opsional)",
                  )}
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Contact changes apply only to this reservation. Booking emails and guest access stay with the original verified email address.",
                  "Промените на контактот важат само за оваа резервација. Пораките за резервацијата и пристапот на гостинот остануваат поврзани со првично потврдената е-пошта.",
                  "Ndryshimet e kontaktit vlejnë vetëm për këtë rezervim. Email-et e rezervimit dhe qasja e mysafirit mbeten te adresa fillestare e verifikuar.",
                )}
              </p>
              <ReservationInput
                label={copy("Party size")}
                type="number"
                inputMode="numeric"
                min={choices?.minPartySize ?? 1}
                max={choices?.maxPartySize ?? 100}
                required
                value={party}
                onChange={(event) => {
                  setParty(event.target.value);
                  setAssignment(
                    assignmentKey(baseline.tableIds ?? [baseline.tableId]),
                  );
                }}
              />
              {partyChanged &&
                partyValid &&
                (choices === undefined ? (
                  <Skeleton className="h-16" />
                ) : choices.options.length ? (
                  <div className="space-y-2">
                    <ReservationSelect
                      label={copy("Table assignment")}
                      value={selected ? assignment : ""}
                      onChange={setAssignment}
                      options={choices.options.map((option) => ({
                        value: assignmentKey(option.tableIds),
                        label: option.label,
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      {selected
                        ? t(
                            "Capacity and availability will be checked again when you save.",
                            "Капацитетот и достапноста повторно ќе се проверат при зачувување.",
                            "Kapaciteti dhe disponueshmëria do të kontrollohen përsëri gjatë ruajtjes.",
                          )
                        : t(
                            "The current tables do not fit this party. Choose an available assignment to continue.",
                            "Тековните маси не одговараат за групата. Изберете достапни маси за да продолжите.",
                            "Tavolinat aktuale nuk përshtaten për këtë grup. Zgjidhni një caktim të disponueshëm për të vazhduar.",
                          )}
                    </p>
                    {selected &&
                      baseline.status === "seated" &&
                      assignment !==
                        assignmentKey(
                          baseline.tableIds ?? [baseline.tableId],
                        ) && (
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "The party will move to these tables. Tables they leave will need resetting.",
                            "Групата ќе се премести на овие маси. Ослободените маси ќе треба да се подготват.",
                            "Grupi do të zhvendoset te këto tavolina. Tavolinat që lirohen do të kërkojnë përgatitje.",
                          )}
                        </p>
                      )}
                  </div>
                ) : (
                  <p
                    role="status"
                    className="rounded-xl border bg-muted/30 p-3 text-sm"
                  >
                    {choices.reason
                      ? copy(choices.reason)
                      : t(
                          "No tables can accommodate this party for the current visit. Keep the current party size or change the reservation time separately.",
                          "Нема маси за оваа група во тековниот термин. Задржете го бројот на гости или сменете го терминот одделно.",
                          "Asnjë tavolinë nuk mund ta presë këtë grup për vizitën aktuale. Mbani madhësinë aktuale ose ndryshoni orën veçmas.",
                        )}
                  </p>
                ))}
              <Field>
                <FieldLabel htmlFor={noteId}>
                  {t(
                    "Special requests (optional)",
                    "Посебни барања (опционално)",
                    "Kërkesa të veçanta (opsionale)",
                  )}
                </FieldLabel>
                <Textarea
                  id={noteId}
                  rows={3}
                  maxLength={2000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </Field>
            </FieldGroup>
          </fieldset>
          {!isWebSocketConnected && (
            <p role="status" className="text-sm text-muted-foreground">
              {t(
                "Reconnecting… Changes can be saved once the connection returns.",
                "Повторно поврзување… Промените може да се зачуваат кога ќе се врати врската.",
                "Duke u rilidhur… Ndryshimet mund të ruhen pasi të rikthehet lidhja.",
              )}
            </p>
          )}
          <ReservationError error={action.error ? copy(action.error) : null} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={action.busy}
              onClick={onClose}
            >
              {copy("Keep reservation")}
            </Button>
            <Button type="submit" disabled={action.busy || blocked || !dirty}>
              {action.busy
                ? copy("Saving…")
                : t("Save changes", "Зачувај промени", "Ruaj ndryshimet")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
