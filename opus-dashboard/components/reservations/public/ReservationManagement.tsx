"use client";

import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useClientAccount } from "@/hooks/use-client-account";
import { clientSignInPath } from "@/lib/client-account";
import {
  earliestReservationServiceDate,
  reservationDateTime,
  reservationError,
} from "@/lib/reservation-format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationFrame } from "./ReservationFrame";
import type { ManagedReservation } from "./types";

export function ReservationManagement({
  slug,
  reservationId,
}: {
  slug: string;
  reservationId: Id<"reservations">;
}) {
  const { t } = useDashboardI18n();
  const [proof, setProof] = useState<{ ready: boolean; token?: string }>({
    ready: false,
  });
  const { user, isLoading } = useClientAccount();
  useEffect(() => {
    const key = `opus-reservation:${slug}:${reservationId}`;
    const token = new URLSearchParams(window.location.hash.slice(1)).get(
      "token",
    );
    let stored: string | undefined;
    try {
      if (token) sessionStorage.setItem(key, token);
      stored = sessionStorage.getItem(key) ?? undefined;
    } catch {
      /* The proof in this tab still works when storage is unavailable. */
    }
    if (token) window.history.replaceState(null, "", window.location.pathname);
    const frame = requestAnimationFrame(() =>
      setProof({ ready: true, token: token || stored }),
    );
    return () => cancelAnimationFrame(frame);
  }, [slug, reservationId]);
  const managed = useQuery(
    api.reservationPublic.getManaged,
    proof.ready && !isLoading
      ? { slug, reservationId, token: proof.token }
      : "skip",
  );
  if (managed === undefined)
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  if (!managed)
    return (
      <ReservationFrame name="OPUS">
        <Alert>
          <AlertTitle>
            {t(
              "Reservation link unavailable",
              "Линкот за резервацијата не е достапен",
              "Lidhja e rezervimit nuk është e disponueshme",
            )}
          </AlertTitle>
          <AlertDescription>
            {t(
              "Open the complete link from your latest confirmation email, or sign in to the account that owns this reservation.",
              "Отворете го целиот линк од последната потврда по е-пошта или најавете се во сметката на која ѝ припаѓа резервацијата.",
              "Hapni lidhjen e plotë nga emaili i fundit i konfirmimit ose hyni në llogarinë të cilës i përket rezervimi.",
            )}
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link
            href={clientSignInPath(`/reserve/${slug}/manage/${reservationId}`)}
          >
            {t("Sign in", "Најавете се", "Hyni")}
          </Link>
        </Button>
      </ReservationFrame>
    );
  return (
    <ManagedDetails
      key={`${managed.reservation.id}:${managed.reservation.revision}`}
      managed={managed}
      token={proof.token}
      signedIn={Boolean(user)}
    />
  );
}

function ManagedDetails({
  managed,
  token,
  signedIn,
}: {
  managed: ManagedReservation;
  token?: string;
  signedIn: boolean;
}) {
  const copy = useReservationCopy();
  const { t, locale } = useDashboardI18n();
  const { venue, reservation } = managed;
  const [mode, setMode] = useState<"view" | "change" | "cancel">("view");
  const [date, setDate] = useState(reservation.serviceDate);
  const [partySize, setPartySize] = useState(reservation.partySize);
  const [startAt, setStartAt] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const base = { slug: venue.slug, reservationId: reservation.id, token };
  const slots = useQuery(
    api.reservationPublic.managedSlots,
    mode === "change" &&
      date &&
      Number.isSafeInteger(partySize) &&
      partySize > 0
      ? { ...base, date, partySize }
      : "skip",
  );
  const cancel = useMutation(api.reservationPublic.cancel);
  const reschedule = useMutation(api.reservationPublic.reschedule);
  const claim = useMutation(api.reservationPublic.claim);
  const selected = slots?.find((slot) => slot.startAt === startAt);
  async function change(operation: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await operation();
      setMode("view");
    } catch (caught) {
      setError(reservationError(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <ReservationFrame name={venue.name}>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("Your reservation", "Вашата резервација", "Rezervimi juaj")}
          </CardTitle>
          <CardDescription>
            {[venue.address, venue.city].filter(Boolean).join(", ")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <p className="text-xl font-medium">
                {reservationDateTime(
                  reservation.startAt,
                  venue.timezone,
                  locale,
                )}
              </p>
              <p>
                {reservation.partySize}
                {t(" guests · ", " гости · ", " mysafirë · ")}
                {reservation.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Venue timezone: ",
                  "Временска зона на локалот: ",
                  "Zona kohore e lokalit: ",
                )}
                {venue.timezone}
              </p>
            </div>
            <Badge variant="secondary">
              {copy(reservation.status).replaceAll("_", " ")}
            </Badge>
          </div>
          {reservation.specialRequests && (
            <p className="text-sm [overflow-wrap:anywhere]">
              {reservation.specialRequests}
            </p>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>
                {t(
                  "Change not completed",
                  "Измената не е завршена",
                  "Ndryshimi nuk u përfundua",
                )}
              </AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {message && <p role="status">{message}</p>}
          {mode === "view" && (
            <div className="flex flex-wrap gap-3">
              {managed.canReschedule && (
                <Button variant="outline" onClick={() => setMode("change")}>
                  {t(
                    "Change reservation",
                    "Изменете ја резервацијата",
                    "Ndryshoni rezervimin",
                  )}
                </Button>
              )}
              {managed.canCancel && (
                <Button variant="outline" onClick={() => setMode("cancel")}>
                  {t(
                    "Cancel reservation",
                    "Откажете ја резервацијата",
                    "Anuloni rezervimin",
                  )}
                </Button>
              )}
              {managed.canClaim &&
                (signedIn && token ? (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void change(async () => {
                        await claim({ ...base, token });
                        setMessage(
                          t(
                            "Reservation saved to your account.",
                            "Резервацијата е зачувана во вашата сметка.",
                            "Rezervimi u ruajt në llogarinë tuaj.",
                          ),
                        );
                      })
                    }
                  >
                    {t(
                      "Save to my account",
                      "Зачувајте во мојата сметка",
                      "Ruajeni në llogarinë time",
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" asChild>
                    <Link
                      href={clientSignInPath(
                        `/reserve/${venue.slug}/manage/${reservation.id}`,
                      )}
                    >
                      {t(
                        "Save to an optional account",
                        "Зачувајте во сметка по желба",
                        "Ruajeni në një llogari opsionale",
                      )}
                    </Link>
                  </Button>
                ))}
              {signedIn && (
                <Button variant="link" asChild>
                  <Link href="/account">
                    {t("My account", "Мојата сметка", "Llogaria ime")}
                  </Link>
                </Button>
              )}
            </div>
          )}
          {!managed.canCancel &&
            !managed.canReschedule &&
            !["cancelled", "completed", "no_show"].includes(
              reservation.status,
            ) && (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Online changes are unavailable. Please contact the venue.",
                  "Онлајн измените не се достапни. Контактирајте со локалот.",
                  "Ndryshimet online nuk janë të disponueshme. Kontaktoni lokalin.",
                )}
                {venue.phone && (
                  <>
                    {" "}
                    <a href={`tel:${venue.phone}`} className="underline">
                      {venue.phone}
                    </a>
                  </>
                )}
              </p>
            )}
          {mode === "cancel" && (
            <Alert>
              <AlertTitle>
                {t(
                  "Cancel this reservation?",
                  "Да ја откажете резервацијата?",
                  "Ta anuloni këtë rezervim?",
                )}
              </AlertTitle>
              <AlertDescription>
                <p>
                  {t(
                    "Your table will become available to other guests.",
                    "Вашата маса ќе стане достапна за други гости.",
                    "Tavolina juaj do të bëhet e disponueshme për mysafirë të tjerë.",
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    variant="destructive"
                    disabled={busy}
                    onClick={() =>
                      void change(() =>
                        cancel({
                          ...base,
                          expectedRevision: reservation.revision,
                        }),
                      )
                    }
                  >
                    {t(
                      "Confirm cancellation",
                      "Потврдете го откажувањето",
                      "Konfirmoni anulimin",
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => setMode("view")}
                  >
                    {t(
                      "Keep reservation",
                      "Задржете ја резервацијата",
                      "Mbajeni rezervimin",
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {mode === "change" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (selected)
                  void change(() =>
                    reschedule({
                      ...base,
                      expectedRevision: reservation.revision,
                      date,
                      startAt: selected.startAt,
                      partySize,
                    }),
                  );
              }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="change-party">
                    {t("Party size", "Број на гости", "Numri i mysafirëve")}
                  </FieldLabel>
                  <Input
                    id="change-party"
                    type="number"
                    min={1}
                    max={100}
                    value={partySize || ""}
                    required
                    disabled={busy}
                    onChange={(event) => {
                      setPartySize(Number(event.target.value));
                      setStartAt(undefined);
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="change-date">
                    {t("New date", "Нов датум", "Data e re")}
                  </FieldLabel>
                  <Input
                    id="change-date"
                    type="date"
                    min={earliestReservationServiceDate(venue.timezone)}
                    value={date}
                    required
                    disabled={busy}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setStartAt(undefined);
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="change-time">
                    {t("New time", "Нов термин", "Ora e re")}
                  </FieldLabel>
                  {slots === undefined ? (
                    <Skeleton className="h-10 w-full" />
                  ) : !slots.length ? (
                    <p role="status">
                      {t(
                        "No suitable tables available. Your current reservation is unchanged.",
                        "Нема соодветни слободни маси. Вашата тековна резервација останува непроменета.",
                        "Nuk ka tavolina të përshtatshme të lira. Rezervimi juaj aktual mbetet i pandryshuar.",
                      )}
                    </p>
                  ) : (
                    <Select
                      value={selected ? String(startAt) : ""}
                      onValueChange={(value) => setStartAt(Number(value))}
                    >
                      <SelectTrigger id="change-time" className="w-full">
                        <SelectValue
                          placeholder={t(
                            "Choose a new time",
                            "Изберете нов термин",
                            "Zgjidhni një orar të ri",
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {slots.map((slot) => (
                            <SelectItem
                              value={String(slot.startAt)}
                              key={slot.startAt}
                            >
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  )}
                </Field>
                {selected && (
                  <p>
                    {reservationDateTime(
                      selected.startAt,
                      venue.timezone,
                      locale,
                    )}{" "}
                    · {partySize}
                    {t(" guests", " гости", " mysafirë")}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={busy || !selected}>
                    {t(
                      "Confirm change",
                      "Потврдете ја измената",
                      "Konfirmoni ndryshimin",
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => setMode("view")}
                  >
                    {t(
                      "Keep current reservation",
                      "Задржете ја тековната резервација",
                      "Mbajeni rezervimin aktual",
                    )}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </ReservationFrame>
  );
}
