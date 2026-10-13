"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Coffee, Utensils } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useReservationAction } from "@/hooks/use-reservation-action";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  StepFrame,
  WizardActions,
} from "@/components/onboarding/OnboardingStep";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Spinner } from "@/components/ui/spinner";
import {
  emptyVenueDraft,
  parseVenueDraft,
  serializeVenueDraft,
  validVenueName,
  venueDraftKey,
  type VenueOnboardingDraft,
} from "@/lib/venue-onboarding-draft";

type CreateVenueProps = { onBack?: () => void; onCreated?: () => void };

export function CreateVenue(props: CreateVenueProps) {
  const profile = useQuery(api.users.getMyProfile);
  if (!profile) return <Spinner />;
  const draftKey = venueDraftKey(profile.user._id, profile.orgId);
  return <VenueCreationForm key={draftKey} draftKey={draftKey} {...props} />;
}

function readDraft(key: string) {
  try {
    return parseVenueDraft(sessionStorage.getItem(key), Date.now());
  } catch {
    return emptyVenueDraft();
  }
}

function VenueCreationForm({
  draftKey,
  onBack,
  onCreated,
}: CreateVenueProps & { draftKey: string }) {
  const { t } = useDashboardI18n();
  const router = useRouter();
  const start = useMutation(api.hospitality.startVenue);
  const action = useReservationAction();
  const [draft, setDraft] = useState<VenueOnboardingDraft>(() =>
    readDraft(draftKey),
  );
  const [invalid, setInvalid] = useState<"name" | "type" | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const busy = action.busy || submitted;
  const nameInput = useRef<HTMLInputElement>(null);
  const firstType = useRef<HTMLButtonElement>(null);
  const serverError = useRef<HTMLDivElement>(null);
  const submitting = useRef(false);
  const created = useRef(false);

  useEffect(() => {
    if (created.current) return;
    try {
      sessionStorage.setItem(draftKey, serializeVenueDraft(draft, Date.now()));
    } catch {
      // Storage may be disabled; the in-memory journey remains usable.
    }
  }, [draft, draftKey]);

  useEffect(() => {
    if (action.error) serverError.current?.focus();
  }, [action.error]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    if (!validVenueName(draft.name)) {
      setInvalid("name");
      if (draft.step === 2) setDraft({ ...draft, step: 1 });
      nameInput.current?.focus();
      return;
    }
    setInvalid(null);
    if (draft.step === 1) {
      setDraft({ ...draft, name: draft.name.trim(), step: 2 });
      return;
    }
    if (!draft.type) {
      setInvalid("type");
      firstType.current?.focus();
      return;
    }
    const venueType = draft.type;
    submitting.current = true;
    const success = await action.run(async () => {
      await start({ name: draft.name.trim(), venueType });
      created.current = true;
      setSubmitted(true);
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Storage is optional. */
      }
      if (onCreated) onCreated();
      else router.replace("/hospitality");
    });
    // Keep successful submissions locked until navigation has completed.
    if (!success) submitting.current = false;
  }

  function back() {
    if (submitting.current) return;
    setInvalid(null);
    if (draft.step === 2) setDraft({ ...draft, step: 1 });
    else onBack?.();
  }

  return (
    <div
      className="flex w-full min-w-0 flex-col items-center"
      data-testid="venue-onboarding"
    >
      <OnboardingProgress
        step={draft.step}
        total={2}
        label={t(
          "Venue setup",
          "Поставување на локалот",
          "Konfigurimi i lokalit",
        )}
        description={t("Your venue", "Вашиот локал", "Lokali juaj")}
      />
      <form
        className="w-full"
        onSubmit={submit}
        noValidate
        aria-busy={busy}
        onKeyDown={(event) => {
          // A selected card can submit with Enter; an unselected card first selects.
          if (
            event.key === "Enter" &&
            !event.repeat &&
            draft.step === 2 &&
            event.target instanceof HTMLButtonElement &&
            event.target.getAttribute("role") === "radio" &&
            event.target.getAttribute("aria-checked") === "true"
          ) {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
      >
        <StepFrame
          replayPublicTitle
          replayPublicDescription
          title={
            draft.step === 1
              ? t(
                  "What’s your venue called?",
                  "Како се вика вашиот локал?",
                  "Si quhet lokali juaj?",
                )
              : t(
                  "Is it a café or a restaurant?",
                  "Кафуле или ресторан?",
                  "Është kafene apo restorant?",
                )
          }
          description={
            draft.step === 1
              ? t(
                  "Enter the name your guests know you by.",
                  "Внесете го името по кое ве познаваат гостите.",
                  "Shkruani emrin me të cilin ju njohin mysafirët.",
                )
              : t(
                  "Choose the type that best fits your venue.",
                  "Изберете го типот што најдобро го опишува вашиот локал.",
                  "Zgjidhni llojin që i përshtatet më së miri lokalit tuaj.",
                )
          }
        >
          <FieldGroup>
            {draft.step === 1 ? (
              <Field data-invalid={invalid === "name" || undefined}>
                <FieldLabel htmlFor="venue-name" data-replay-public>
                  {t("Venue name", "Име на локалот", "Emri i lokalit")}
                </FieldLabel>
                <Input
                  ref={nameInput}
                  id="venue-name"
                  name="venueName"
                  value={draft.name}
                  autoComplete="organization"
                  maxLength={120}
                  minLength={2}
                  required
                  disabled={busy}
                  aria-invalid={invalid === "name"}
                  aria-describedby={
                    invalid === "name" ? "venue-name-error" : undefined
                  }
                  className="min-h-12"
                  onChange={(event) => {
                    setDraft({ ...draft, name: event.target.value });
                    if (invalid === "name") setInvalid(null);
                  }}
                />
                {invalid === "name" && (
                  <FieldError id="venue-name-error">
                    {t(
                      "Enter a venue name between 2 and 120 characters.",
                      "Внесете име на локалот од 2 до 120 знаци.",
                      "Shkruani një emër lokali nga 2 deri në 120 karaktere.",
                    )}
                  </FieldError>
                )}
              </Field>
            ) : (
              <Field data-invalid={invalid === "type" || undefined}>
                <ToggleGroup
                  type="single"
                  value={draft.type ?? ""}
                  variant="outline"
                  spacing={4}
                  className="grid w-full grid-cols-2"
                  disabled={busy}
                  aria-label={t(
                    "Venue type",
                    "Тип на локал",
                    "Lloji i lokalit",
                  )}
                  aria-invalid={invalid === "type"}
                  aria-describedby={
                    invalid === "type" ? "venue-type-error" : undefined
                  }
                  onValueChange={(value) => {
                    setDraft({
                      ...draft,
                      type:
                        value === "cafe" || value === "restaurant"
                          ? value
                          : null,
                    });
                    setInvalid(null);
                  }}
                >
                  <ToggleGroupItem
                    ref={firstType}
                    value="cafe"
                    data-testid="venue-type-cafe"
                    className="h-auto min-h-36 w-full flex-col gap-4 rounded-xl bg-card p-6 data-[state=on]:border-primary data-[state=on]:bg-card motion-safe:active:scale-[0.98]"
                  >
                    <Coffee className="size-8" aria-hidden="true" />
                    <span>{t("Café", "Кафуле", "Kafene")}</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="restaurant"
                    data-testid="venue-type-restaurant"
                    className="h-auto min-h-36 w-full flex-col gap-4 rounded-xl bg-card p-6 data-[state=on]:border-primary data-[state=on]:bg-card motion-safe:active:scale-[0.98]"
                  >
                    <Utensils className="size-8" aria-hidden="true" />
                    <span>{t("Restaurant", "Ресторан", "Restorant")}</span>
                  </ToggleGroupItem>
                </ToggleGroup>
                {invalid === "type" && (
                  <FieldError id="venue-type-error">
                    {t(
                      "Choose Café or Restaurant to continue.",
                      "Изберете Кафуле или Ресторан за да продолжите.",
                      "Zgjidhni Kafene ose Restorant për të vazhduar.",
                    )}
                  </FieldError>
                )}
              </Field>
            )}
            {action.error && (
              <FieldError ref={serverError} tabIndex={-1}>
                {action.error}
              </FieldError>
            )}
          </FieldGroup>
          <WizardActions
            canGoBack={draft.step === 2 || Boolean(onBack)}
            onBack={back}
            isSubmitting={busy}
            label={
              draft.step === 2
                ? busy
                  ? t(
                      "Creating your venue…",
                      "Го создаваме вашиот локал…",
                      "Po krijojmë lokalin tuaj…",
                    )
                  : t("Open dashboard", "Отвори контролна табла", "Hap panelin")
                : undefined
            }
          />
        </StepFrame>
      </form>
    </div>
  );
}
