"use client";

import Link from "next/link";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useClientAccount } from "@/hooks/use-client-account";
import { clientSignInPath } from "@/lib/client-account";
import {
  earliestReservationServiceDate,
  reservationDateTime,
  reservationError,
  reservationLocalDate,
  reservationPath,
} from "@/lib/reservation-format";
import { tenantSiteUrl } from "@/lib/tenant-sites";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ReservationFrame } from "./ReservationFrame";
import type { ReservationVenue } from "./types";

export function ReservationForm({
  venue,
  initialDate,
  initialPartySize,
  initialStartAt,
}: {
  venue: ReservationVenue;
  initialDate?: string;
  initialPartySize?: number;
  initialStartAt?: number;
}) {
  const { t, locale } = useDashboardI18n();
  const { user } = useClientAccount();
  const [date, setDate] = useState(
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : reservationLocalDate(venue.timezone),
  );
  const [partySize, setPartySize] = useState(
    initialPartySize &&
      initialPartySize >= venue.settings.minPartySize &&
      initialPartySize <= venue.settings.maxPartySize
      ? initialPartySize
      : Math.min(
          venue.settings.maxPartySize,
          Math.max(venue.settings.minPartySize, 2),
        ),
  );
  const [startAt, setStartAt] = useState(initialStartAt);
  const [name, setName] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [phone, setPhone] = useState<string>();
  const [specialRequests, setSpecialRequests] = useState("");
  const [challenge, setChallenge] = useState<{
    challengeId: Id<"booking_email_verifications">;
    expiresAt: number;
    resendAfter: number;
  }>();
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmed, setConfirmed] = useState<{
    manageUrl: string;
    startAt: number;
    partySize: number;
  }>();
  const requestKey = useRef<string | undefined>(undefined);
  const requestOtp = useAction(api.reservationPublic.requestOtp);
  const confirm = useAction(api.reservationPublic.confirm);
  const validPartySize =
    Number.isSafeInteger(partySize) &&
    partySize >= venue.settings.minPartySize &&
    partySize <= venue.settings.maxPartySize;
  const slots = useQuery(
    api.reservationPublic.getSlots,
    validPartySize && date && !confirmed
      ? { slug: venue.slug, date, partySize }
      : "skip",
  );
  const selected = slots?.find((slot) => slot.startAt === startAt);
  const customerName = name ?? user?.name ?? "";
  const customerEmail = user?.email ?? email ?? "";
  const customerPhone = phone ?? user?.phone ?? "";
  const signedIn = Boolean(
    user && customerEmail.trim().toLowerCase() === user.email.toLowerCase(),
  );
  const venueHref = tenantSiteUrl(
    venue.slug,
    process.env.NEXT_PUBLIC_ROOT_DOMAIN || "opus.mk",
  );

  useEffect(() => {
    try {
      const key = `opus-reservation-draft:${venue.slug}`;
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, unknown>;
      if (
        typeof draft.savedAt !== "number" ||
        Date.now() - draft.savedAt > 15 * 60_000
      )
        return;
      const frame = requestAnimationFrame(() => {
        sessionStorage.removeItem(key);
        if (typeof draft.name === "string") setName(draft.name);
        if (typeof draft.email === "string") setEmail(draft.email);
        if (typeof draft.phone === "string") setPhone(draft.phone);
        if (typeof draft.specialRequests === "string")
          setSpecialRequests(draft.specialRequests);
      });
      return () => cancelAnimationFrame(frame);
    } catch {
      /* Private draft restoration is optional; no contact data enters the URL. */
    }
  }, [venue.slug]);

  function savePrivateDraft() {
    try {
      sessionStorage.setItem(
        `opus-reservation-draft:${venue.slug}`,
        JSON.stringify({
          savedAt: Date.now(),
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          specialRequests,
        }),
      );
    } catch {
      /* Public selections still survive the redirect when storage is unavailable. */
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      if (!signedIn && !challenge) {
        setChallenge(
          await requestOtp({ slug: venue.slug, email: customerEmail.trim() }),
        );
        return;
      }
      requestKey.current ??= crypto.randomUUID();
      const result = await confirm({
        slug: venue.slug,
        date,
        partySize,
        startAt: selected.startAt,
        name: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim() || undefined,
        specialRequests: specialRequests.trim() || undefined,
        idempotencyKey: requestKey.current,
        ...(signedIn ? {} : { challengeId: challenge!.challengeId, otp }),
      });
      setConfirmed({
        manageUrl: result.manageUrl,
        startAt: selected.startAt,
        partySize,
      });
    } catch (caught) {
      setError(reservationError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ReservationFrame name={venue.name} venueHref={venueHref}>
      {confirmed ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t(
                "Reservation confirmed",
                "Резервацијата е потврдена",
                "Rezervimi u konfirmua",
              )}
            </CardTitle>
            <CardDescription>
              {venue.name}
              {t(" is expecting you.", " ве очекува.", " ju pret.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-5">
            <p className="text-lg">
              {reservationDateTime(confirmed.startAt, venue.timezone, locale)} ·{" "}
              {confirmed.partySize}
              {t(" guests", " гости", " mysafirë")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                "Keep your confirmation email to manage your reservation. You can also save it to an optional OPUS account.",
                "Зачувајте ја потврдата по е-пошта за да управувате со резервацијата. По желба можете да ја зачувате и во OPUS сметка.",
                "Ruani emailin e konfirmimit për të menaxhuar rezervimin. Nëse dëshironi, mund ta ruani edhe në një llogari OPUS.",
              )}
            </p>
            <Button asChild>
              <Link href={confirmed.manageUrl}>
                {t(
                  "Manage reservation",
                  "Управувајте со резервацијата",
                  "Menaxhoni rezervimin",
                )}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              {t(
                "Reserve a table",
                "Резервирајте маса",
                "Rezervoni një tavolinë",
              )}
            </h1>
            <p className="text-muted-foreground">
              {t(
                "Choose when you would like to visit. No account required.",
                "Изберете кога сакате да нè посетите. Не е потребна сметка.",
                "Zgjidhni kur dëshironi të na vizitoni. Nuk nevojitet llogari.",
              )}
            </p>
          </div>
          {!venue.acceptingReservations ? (
            <Alert>
              <AlertTitle>
                {t(
                  "Online reservations are paused",
                  "Онлајн резервациите се паузирани",
                  "Rezervimet online janë pezulluar",
                )}
              </AlertTitle>
              <AlertDescription>
                {t("Please contact ", "Контактирајте со ", "Kontaktoni ")}
                {venue.name}
                {t(
                  " to arrange your visit.",
                  " за да ја договорите вашата посета.",
                  " për të organizuar vizitën tuaj.",
                )}
                {venue.phone && (
                  <a href={`tel:${venue.phone}`}>{venue.phone}</a>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <form
              onSubmit={(event) => void submit(event)}
              className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]"
            >
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("Your visit", "Вашата посета", "Vizita juaj")}
                  </CardTitle>
                  <CardDescription>
                    {t(
                      "All times are local to the venue (",
                      "Сите времиња се во локалната временска зона на локалот (",
                      "Të gjitha oraret janë sipas zonës kohore të lokalit (",
                    )}
                    {venue.timezone}).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="reservation-party">
                        {t("Party size", "Број на гости", "Numri i mysafirëve")}
                      </FieldLabel>
                      <Input
                        id="reservation-party"
                        type="number"
                        min={venue.settings.minPartySize}
                        max={venue.settings.maxPartySize}
                        required
                        value={partySize || ""}
                        onChange={(event) => {
                          setPartySize(Number(event.target.value));
                          setStartAt(undefined);
                          requestKey.current = undefined;
                        }}
                        disabled={busy}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="reservation-date">
                        {t("Date", "Датум", "Data")}
                      </FieldLabel>
                      <Input
                        id="reservation-date"
                        type="date"
                        required
                        min={earliestReservationServiceDate(venue.timezone)}
                        value={date}
                        onChange={(event) => {
                          setDate(event.target.value);
                          setStartAt(undefined);
                          requestKey.current = undefined;
                        }}
                        disabled={busy}
                      />
                      <FieldDescription>
                        {t(
                          "For service after midnight, choose the date that the evening service starts.",
                          "За посета по полноќ, изберете го датумот на кој започнува вечерниот период.",
                          "Për vizita pas mesnatës, zgjidhni datën kur fillon shërbimi i mbrëmjes.",
                        )}
                      </FieldDescription>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="reservation-time">
                        {t("Available time", "Слободен термин", "Ora e lirë")}
                      </FieldLabel>
                      {slots === undefined ? (
                        <Skeleton className="h-10 w-full" />
                      ) : slots.length === 0 ? (
                        <p
                          role="status"
                          className="text-sm text-muted-foreground"
                        >
                          {t(
                            "No tables available for this party and date. Try another date or contact the venue.",
                            "Нема слободни маси за овој број гости и датум. Изберете друг датум или контактирајте со локалот.",
                            "Nuk ka tavolina të lira për këtë numër mysafirësh dhe datë. Provoni një datë tjetër ose kontaktoni lokalin.",
                          )}
                        </p>
                      ) : (
                        <Select
                          value={selected ? String(startAt) : ""}
                          onValueChange={(value) => {
                            setStartAt(Number(value));
                            requestKey.current = undefined;
                          }}
                          disabled={busy}
                        >
                          <SelectTrigger
                            id="reservation-time"
                            className="w-full"
                          >
                            <SelectValue
                              placeholder={t(
                                "Choose a time",
                                "Изберете термин",
                                "Zgjidhni një orar",
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {slots.map((slot) => (
                                <SelectItem
                                  key={slot.startAt}
                                  value={String(slot.startAt)}
                                >
                                  {slot.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                      {startAt && slots && !selected && (
                        <p role="status" className="text-sm text-destructive">
                          {t(
                            "That time is no longer available. Please choose another.",
                            "Овој термин повеќе не е слободен. Изберете друг.",
                            "Ky orar nuk është më i lirë. Zgjidhni një tjetër.",
                          )}
                        </p>
                      )}
                    </Field>
                    {selected && (
                      <p className="text-sm">
                        {reservationDateTime(
                          selected.startAt,
                          venue.timezone,
                          locale,
                        )}{" "}
                        · {partySize}
                        {t(" guests ·", " гости ·", " mysafirë ·")}{" "}
                        {venue.settings.defaultDurationMins}
                        {t(" minutes", " минути", " minuta")}
                      </p>
                    )}
                  </FieldGroup>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("Your details", "Вашите податоци", "Të dhënat tuaja")}
                  </CardTitle>
                  <CardDescription>
                    {user
                      ? t(
                          `Signed in as ${user.email}`,
                          `Најавени сте како ${user.email}`,
                          `Keni hyrë si ${user.email}`,
                        )
                      : t(
                          "A confirmation and management link will be sent to your email.",
                          "Ќе добиете потврда и линк за управување со резервацијата по е-пошта.",
                          "Konfirmimi dhe lidhja për menaxhimin e rezervimit do t'ju dërgohen me email.",
                        )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    {!user && (
                      <Button variant="outline" asChild>
                        <Link
                          onClick={savePrivateDraft}
                          href={clientSignInPath(
                            reservationPath(venue.slug, {
                              date,
                              partySize,
                              startAt,
                            }),
                          )}
                        >
                          {t(
                            "Already have an account? Sign in",
                            "Веќе имате сметка? Најавете се",
                            "Keni llogari? Hyni",
                          )}
                        </Link>
                      </Button>
                    )}
                    <Field>
                      <FieldLabel htmlFor="reservation-name">
                        {t("Your name", "Вашето име", "Emri juaj")}
                      </FieldLabel>
                      <Input
                        id="reservation-name"
                        autoComplete="name"
                        required
                        maxLength={120}
                        value={customerName}
                        onChange={(event) => setName(event.target.value)}
                        disabled={busy}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="reservation-email">
                        {t("Email", "Е-пошта", "Email")}
                      </FieldLabel>
                      <Input
                        id="reservation-email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={customerEmail}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          setChallenge(undefined);
                          setOtp("");
                          requestKey.current = undefined;
                        }}
                        disabled={busy || Boolean(user)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="reservation-phone">
                        {t(
                          "Phone (optional)",
                          "Телефон (по желба)",
                          "Telefoni (opsional)",
                        )}
                      </FieldLabel>
                      <Input
                        id="reservation-phone"
                        type="tel"
                        autoComplete="tel"
                        maxLength={40}
                        value={customerPhone}
                        onChange={(event) => setPhone(event.target.value)}
                        disabled={busy}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="reservation-requests">
                        {t(
                          "Special requests (optional)",
                          "Посебни барања (по желба)",
                          "Kërkesa të veçanta (opsionale)",
                        )}
                      </FieldLabel>
                      <Textarea
                        id="reservation-requests"
                        maxLength={1000}
                        value={specialRequests}
                        onChange={(event) =>
                          setSpecialRequests(event.target.value)
                        }
                        disabled={busy}
                      />
                      <FieldDescription>
                        {t(
                          "Requests depend on availability. Contact the venue for anything essential.",
                          "Барањата зависат од достапноста. За важни потреби, контактирајте директно со локалот.",
                          "Kërkesat varen nga disponueshmëria. Për nevoja të domosdoshme, kontaktoni drejtpërdrejt lokalin.",
                        )}
                      </FieldDescription>
                    </Field>
                    {challenge && !signedIn && (
                      <Field>
                        <FieldLabel htmlFor="reservation-otp">
                          {t(
                            "Email verification code",
                            "Код за потврда на е-поштата",
                            "Kodi i verifikimit të emailit",
                          )}
                        </FieldLabel>
                        <Input
                          id="reservation-otp"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          pattern="[0-9]{6}"
                          minLength={6}
                          maxLength={6}
                          required
                          value={otp}
                          onChange={(event) => setOtp(event.target.value)}
                          disabled={busy}
                        />
                        <FieldDescription>
                          {t(
                            "Enter the six-digit code sent to ",
                            "Внесете го шестцифрениот код испратен на ",
                            "Shkruani kodin gjashtëshifror të dërguar në ",
                          )}
                          {customerEmail}.
                        </FieldDescription>
                        <Button
                          type="button"
                          variant="link"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            setError(undefined);
                            try {
                              setChallenge(
                                await requestOtp({
                                  slug: venue.slug,
                                  email: customerEmail.trim(),
                                }),
                              );
                              setOtp("");
                            } catch (caught) {
                              setError(reservationError(caught));
                            } finally {
                              setBusy(false);
                            }
                          }}
                        >
                          {t(
                            "Send a new code",
                            "Испратете нов код",
                            "Dërgoni një kod të ri",
                          )}
                        </Button>
                      </Field>
                    )}
                    {error && (
                      <Alert variant="destructive">
                        <AlertTitle>
                          {t(
                            "Reservation not completed",
                            "Резервацијата не е завршена",
                            "Rezervimi nuk u përfundua",
                          )}
                        </AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "You can change or cancel online until",
                        "Можете да измените или откажете онлајн до",
                        "Mund të ndryshoni ose anuloni online deri në",
                      )}{" "}
                      {venue.settings.cancellationWindowHours}
                      {t(
                        " hours before arrival.",
                        " часа пред пристигнувањето.",
                        " orë para mbërritjes.",
                      )}
                    </p>
                    <Button type="submit" disabled={busy || !selected}>
                      {busy
                        ? t("Please wait…", "Почекајте…", "Ju lutemi prisni…")
                        : signedIn || challenge
                          ? t(
                              "Confirm reservation",
                              "Потврдете ја резервацијата",
                              "Konfirmoni rezervimin",
                            )
                          : t(
                              "Send verification code",
                              "Испратете код за потврда",
                              "Dërgoni kodin e verifikimit",
                            )}
                    </Button>
                  </FieldGroup>
                </CardContent>
              </Card>
            </form>
          )}
        </>
      )}
    </ReservationFrame>
  );
}
