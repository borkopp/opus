"use client";

import { useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { Camera, Upload, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ExtractedService } from "@/convex/lib/serviceImport";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { onboardingError } from "@/lib/i18n/onboarding";
import { validateFirstService, type ServiceDraft } from "@/lib/onboarding";
import { prepareServicePhoto } from "@/lib/service-photo";
import { StepFrame, WizardActions } from "./OnboardingStep";

type ReviewRow = ServiceDraft & {
  id: number;
  source: ExtractedService["durationSource"] | "edited";
  confidence: number;
};

export function ServicePhotoImport({
  slotDurationMins,
  onBack,
  onImported,
}: {
  slotDurationMins: number;
  onBack: () => void;
  onImported: (service: ServiceDraft) => void;
}) {
  const { t, language } = useDashboardI18n();
  const extract = useAction(api.servicePhoto.extract);
  const confirm = useMutation(api.serviceImports.confirm);
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [importId, setImportId] = useState<Id<"service_imports"> | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDuration, setBulkDuration] = useState(30);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState<"reading" | "saving" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function read(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    setBusy("reading");
    try {
      const image = await prepareServicePhoto(file);
      setPreview(image);
      const result = await extract({ image });
      if (!result.rows.length) {
        setError(
          t(
            "No services were found. Try a clear photo of your price list.",
            "Не се пронајдени услуги. Прикачете јасна фотографија од ценовникот.",
            "Nuk u gjet asnjë shërbim. Provoni një foto të qartë të listës së çmimeve tuaja.",
          ),
        );
        return;
      }
      setImportId(result.importId);
      setRows(
        result.rows.map((row, id) => ({
          id,
          name: row.name,
          price:
            row.priceMinorUnits === null
              ? ""
              : String(row.priceMinorUnits / 100),
          durationMins: row.durationMins ?? 0,
          source: row.durationSource,
          confidence: row.confidenceScore,
        })),
      );
      setSelected(new Set(result.rows.map((_, id) => id)));
      setReviewed(false);
      setAttempted(false);
    } catch (caught) {
      setError(onboardingError(caught, language));
    } finally {
      setBusy(null);
    }
  }

  function edit(id: number, patch: Partial<ReviewRow>) {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    setReviewed(false);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (!importId || busy || !rows.length) return;
    if (
      rows.some(
        (row) =>
          validateFirstService(row, slotDurationMins) ||
          row.name.trim().length > 120 ||
          row.durationMins > 720 ||
          Number(row.price.replace(",", ".")) > 1_000_000,
      )
    ) {
      setError(
        t(
          "Check every service name, price and duration.",
          "Проверете ги името, цената и времетраењето на секоја услуга.",
          "Kontrolloni emrin, çmimin dhe kohëzgjatjen e çdo shërbimi.",
        ),
      );
      return;
    }
    if (!reviewed) return;
    setError(null);
    setBusy("saving");
    try {
      await confirm({
        importId,
        reviewed,
        services: rows.map((row) => ({
          name: row.name.trim(),
          durationMins: row.durationMins,
          priceMinorUnits: Math.round(
            Number(row.price.replace(",", ".")) * 100,
          ),
        })),
      });
      onImported(rows[0]);
    } catch (caught) {
      setError(onboardingError(caught, language));
    } finally {
      setBusy(null);
    }
  }

  return (
    <form className="w-full" onSubmit={save} noValidate>
      <StepFrame
        title={
          rows.length
            ? t(
                "Review your services",
                "Проверете ги услугите",
                "Rishikoni shërbimet tuaja",
              )
            : t(
                "Add services from a photo",
                "Додајте услуги од фотографија",
                "Shtoni shërbime nga një foto",
              )
        }
        description={
          rows.length
            ? t(
                "Check the prices and how long each appointment takes before adding them.",
                "Проверете ги цените и времетраењето на секој термин пред да ги додадете.",
                "Kontrolloni çmimet dhe kohëzgjatjen e çdo termini para se t'i shtoni ato.",
              )
            : t(
                "Photograph your price list or upload an image. AI will prepare the services for you to review.",
                "Фотографирајте го ценовникот или прикачете слика. AI ќе ги подготви услугите за проверка.",
                "Fotografoni listën e çmimeve ose ngarkoni një imazh. AI do të përgatisë shërbimet që t'i rishikoni.",
              )
        }
        replayPublicTitle
        replayPublicDescription
      >
        <div className="flex flex-col gap-6">
          {!rows.length && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-14"
                  disabled={!!busy}
                  onClick={() => camera.current?.click()}
                >
                  <Camera data-icon="inline-start" />
                  {t("Take a photo", "Фотографирај", "Bëni një foto")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-14"
                  disabled={!!busy}
                  onClick={() => upload.current?.click()}
                >
                  <Upload data-icon="inline-start" />
                  {t("Upload a photo", "Прикачи фотографија", "Ngarkoni një foto")}
                </Button>
              </div>
              <input
                ref={upload}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(e) => {
                  void read(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={camera}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                hidden
                onChange={(e) => {
                  void read(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <p className="text-center text-sm text-muted-foreground">
                {t(
                  "JPG, PNG or WebP · up to 20 MB · 50 services per photo. The image is sent to OpenAI to read your price list.",
                  "JPG, PNG или WebP · до 20 MB · 50 услуги по фотографија. Сликата се испраќа до OpenAI за читање на ценовникот.",
                  "JPG, PNG ose WebP · deri në 20 MB · 50 shërbime për foto. Imazhi dërgohet te OpenAI për të lexuar listën e çmimeve.",
                )}
              </p>
            </>
          )}
          {busy === "reading" && (
            <div
              role="status"
              className="flex items-center justify-center gap-2"
            >
              <Spinner />
              {t(
                "Reading your price list…",
                "Се чита ценовникот…",
                "Duke lexuar listën e çmimeve…",
              )}
            </div>
          )}
          {preview && (
            <details className="rounded-xl border p-3">
              <summary className="cursor-pointer text-sm">
                {t("View your photo", "Види ја фотографијата", "Shikoni foton tuaj")}
              </summary>
              {/* Transient local image; never unmask it for session replay. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={t(
                  "Uploaded price list",
                  "Прикачен ценовник",
                  "Lista e çmimeve e ngarkuar",
                )}
                className="ph-no-capture mt-3 max-h-96 w-full object-contain"
              />
            </details>
          )}
          {rows.length > 0 && (
            <>
              <Alert>
                <AlertDescription>
                  {t(
                    "Suggested durations are estimates. Use the full time you reserve for a customer, including preparation and cleanup. You will offer these services; add your team later.",
                    "Предложените времетраења се проценки. Внесете го целото време што го одвојувате за клиентот, вклучувајќи подготовка и чистење. Вие ќе ги нудите услугите; тимот додајте го подоцна.",
                    "Kohëzgjatjet e sugjeruara janë vlerësime. Përdorni kohën e plotë që rezervoni për një klient, përfshirë përgatitjen dhe pastrimin. Ju do t'i ofroni këto shërbime; shtoni ekipin tuaj më vonë.",
                  )}
                </AlertDescription>
              </Alert>
              <FieldGroup className="rounded-xl border p-4">
                <Field orientation="horizontal">
                  <Checkbox
                    id="select-all-services"
                    checked={
                      selected.size === rows.length
                        ? true
                        : selected.size
                          ? "indeterminate"
                          : false
                    }
                    disabled={!!busy}
                    onCheckedChange={(checked) =>
                      setSelected(
                        new Set(checked ? rows.map((row) => row.id) : []),
                      )
                    }
                  />
                  <FieldLabel htmlFor="select-all-services">
                    {t(
                      "Select all for duration",
                      "Избери ги сите за времетраење",
                      "Zgjidh të gjitha për kohëzgjatje",
                    )}
                  </FieldLabel>
                </Field>
                <Field>
                  <FieldLabel htmlFor="bulk-duration">
                    {t(
                      "Duration for selected services (min)",
                      "Времетраење за избраните услуги (мин)",
                      "Kohëzgjatja për shërbimet e zgjedhura (min)",
                    )}
                  </FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      id="bulk-duration"
                      type="number"
                      className="min-h-11 w-24"
                      min={slotDurationMins}
                      step={slotDurationMins}
                      max={720}
                      value={bulkDuration || ""}
                      disabled={!!busy}
                      onChange={(e) => setBulkDuration(Number(e.target.value))}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="min-h-11"
                      disabled={
                        !!busy ||
                        !selected.size ||
                        bulkDuration <= 0 ||
                        bulkDuration > 720 ||
                        bulkDuration % slotDurationMins !== 0
                      }
                      onClick={() => {
                        setRows((current) =>
                          current.map((row) =>
                            selected.has(row.id)
                              ? {
                                  ...row,
                                  durationMins: bulkDuration,
                                  source: "edited",
                                }
                              : row,
                          ),
                        );
                        setReviewed(false);
                      }}
                    >
                      {t(
                        `Apply to ${selected.size}`,
                        `Примени на ${selected.size}`,
                        `Zbato te ${selected.size}`,
                      )}
                    </Button>
                  </div>
                </Field>
              </FieldGroup>
              <div className="flex flex-col gap-4">
                {rows.map((row, index) => {
                  const invalid = attempted
                    ? validateFirstService(row, slotDurationMins)
                    : null;
                  return (
                    <FieldGroup key={row.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Field orientation="horizontal">
                          <Checkbox
                            id={`select-${row.id}`}
                            checked={selected.has(row.id)}
                            disabled={!!busy}
                            onCheckedChange={(checked) =>
                              setSelected((current) => {
                                const next = new Set(current);
                                if (checked) next.add(row.id);
                                else next.delete(row.id);
                                return next;
                              })
                            }
                          />
                          <FieldLabel htmlFor={`select-${row.id}`}>
                            {t(
                              `Service ${index + 1}`,
                              `Услуга ${index + 1}`,
                              `Shërbimi ${index + 1}`,
                            )}
                          </FieldLabel>
                        </Field>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-11 shrink-0"
                          disabled={!!busy}
                          aria-label={t(
                            `Remove service ${index + 1}`,
                            `Отстрани услуга ${index + 1}`,
                            `Hiq shërbimin ${index + 1}`,
                          )}
                          onClick={() => {
                            setRows((current) =>
                              current.filter((item) => item.id !== row.id),
                            );
                            setSelected((current) => {
                              const next = new Set(current);
                              next.delete(row.id);
                              return next;
                            });
                            setReviewed(false);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                      {row.confidence < 0.7 && (
                        <Badge variant="outline">
                          {t(
                            "Check against the photo",
                            "Проверете со фотографијата",
                            "Kontrolloni me foton",
                          )}
                        </Badge>
                      )}
                      <Field data-invalid={invalid === "name"}>
                        <FieldLabel htmlFor={`name-${row.id}`}>
                          {t(
                            "Service name",
                            "Име на услугата",
                            "Emri i shërbimit",
                          )}
                        </FieldLabel>
                        <Input
                          id={`name-${row.id}`}
                          className="min-h-11"
                          value={row.name}
                          maxLength={120}
                          disabled={!!busy}
                          aria-invalid={invalid === "name"}
                          onChange={(e) =>
                            edit(row.id, { name: e.target.value })
                          }
                        />
                      </Field>
                      <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
                        <Field data-invalid={invalid === "price"}>
                          <FieldLabel htmlFor={`price-${row.id}`}>
                            {t("Price (MKD)", "Цена (ден.)", "Çmimi (MKD)")}
                          </FieldLabel>
                          <Input
                            id={`price-${row.id}`}
                            className="min-h-11"
                            inputMode="decimal"
                            value={row.price}
                            placeholder={t(
                              "Enter price",
                              "Внесете цена",
                              "Shënoni çmimin",
                            )}
                            disabled={!!busy}
                            aria-invalid={invalid === "price"}
                            onChange={(e) =>
                              edit(row.id, { price: e.target.value })
                            }
                          />
                        </Field>
                        <Field data-invalid={invalid === "duration"}>
                          <FieldLabel htmlFor={`duration-${row.id}`}>
                            {t(
                              "Duration (min)",
                              "Времетраење (мин)",
                              "Kohëzgjatja (min)",
                            )}
                          </FieldLabel>
                          <Input
                            id={`duration-${row.id}`}
                            className="min-h-11"
                            type="number"
                            min={slotDurationMins}
                            max={720}
                            step={slotDurationMins}
                            value={row.durationMins || ""}
                            disabled={!!busy}
                            aria-invalid={invalid === "duration"}
                            onChange={(e) =>
                              edit(row.id, {
                                durationMins: Number(e.target.value),
                                source: "edited",
                              })
                            }
                          />
                          <FieldDescription>
                            {row.source === "photo"
                              ? t("From photo", "Од фотографијата", "Nga fotoja")
                              : row.source === "suggested"
                                ? t(
                                    "AI suggestion · check it",
                                    "AI предлог · проверете",
                                    "Sugjerim nga AI · kontrolloni",
                                  )
                                : row.source === "missing"
                                  ? t(
                                      "Enter a duration",
                                      "Внесете времетраење",
                                      "Shënoni një kohëzgjatje",
                                    )
                                  : t(
                                      "Set by you",
                                      "Внесено од вас",
                                      "Përcaktuar nga ju",
                                    )}
                          </FieldDescription>
                        </Field>
                      </div>
                    </FieldGroup>
                  );
                })}
              </div>
              <Field orientation="horizontal">
                <Checkbox
                  id="review-import"
                  checked={reviewed}
                  disabled={!!busy}
                  onCheckedChange={(checked) => setReviewed(checked === true)}
                />
                <FieldLabel htmlFor="review-import">
                  {t(
                    "I checked all prices and durations for my studio.",
                    "Ги проверив сите цени и времетраења за моето студио.",
                    "I kontrollova të gjitha çmimet dhe kohëzgjatjet për studion time.",
                  )}
                </FieldLabel>
              </Field>
            </>
          )}
          {error && <FieldError role="alert">{error}</FieldError>}
        </div>
        {rows.length > 0 ? (
          <WizardActions
            canGoBack
            onBack={onBack}
            isSubmitting={busy === "saving"}
            disabled={!reviewed || !!busy}
            label={t(
              `Add ${rows.length} services`,
              `Додај ${rows.length} услуги`,
              `Shto ${rows.length} shërbime`,
            )}
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="mt-6 min-h-11 w-full"
            onClick={onBack}
            disabled={!!busy}
          >
            {t(
              "Enter a service manually",
              "Внеси услуга рачно",
              "Shëno shërbimin manualisht",
            )}
          </Button>
        )}
      </StepFrame>
    </form>
  );
}
