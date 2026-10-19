"use client";
import { useState } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { Bell, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import {
  PUSH_EVENT_OPTIONS,
  PUSH_REMINDER_MINUTES,
  type PushPreferences,
  type PushSettings,
} from "../../../shared/push-notifications";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { useBrowserPush } from "@/hooks/use-browser-push";
import { useSettingsDraft } from "@/hooks/use-settings-draft";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
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
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Disclosure } from "@/components/ui/disclosure";

export function PushPreferencesCard() {
  const settings = useQuery(api.pushNotifications.getSettings);
  if (!settings) return <Skeleton className="h-64 w-full" />;
  return <PushPreferencesForm settings={settings} />;
}
function PreferenceSwitch({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Field orientation="horizontal" data-disabled={disabled}>
      <FieldContent className="min-w-0">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
        className="relative shrink-0 after:absolute after:left-1/2 after:top-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2"
      />
    </Field>
  );
}
function PushPreferencesForm({ settings }: { settings: PushSettings }) {
  const { t } = useDashboardI18n();
  const browser = useBrowserPush(settings);
  const save = useMutation(api.pushNotifications.savePreferences);
  const { isWebSocketConnected } = useConvexConnectionState();
  const { draft, setDraft, isDirty } = useSettingsDraft(settings.preferences);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const disabled = saving || browser.busy || !isWebSocketConnected;
  const needsBrowserSave =
    draft.browserEnabled &&
    !settings.preferences.browserEnabled &&
    !browser.connected;
  const mobileDevices = settings.devices.filter(
    (device) => device.kind === "expo",
  ).length;
  const set = <K extends keyof PushPreferences>(
    key: K,
    value: PushPreferences[K],
  ) => {
    setSaved(false);
    setSaveError(null);
    setDraft((current) => ({ ...current, [key]: value }));
  };
  async function submit() {
    setSaveError(null);
    if (
      draft.quietHours &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.quietStart) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.quietEnd) ||
        draft.quietStart === draft.quietEnd)
    ) {
      const message = t(
        "Choose different, valid quiet-hour times.",
        "Избери различни, валидни времиња за тивките часови.",
        "Zgjidhni orare të ndryshme dhe të vlefshme për orët e qeta.",
      );
      setSaveError(message);
      toast.error(message);
      return;
    }
    setSaving(true);
    try {
      const preferences = draft.quietHours
        ? draft
        : {
            ...draft,
            quietStart: settings.preferences.quietStart,
            quietEnd: settings.preferences.quietEnd,
          };
      await save({ preferences });
      setDraft(preferences);
      setSaved(true);
      toast.success(
        t(
          "Notification preferences saved",
          "Поставките за известувања се зачувани",
          "Preferencat e njoftimeve u ruajtën",
        ),
      );
    } catch {
      const message = t(
        "Could not save notification preferences. Try again.",
        "Поставките за известувања не се зачуваа. Обиди се повторно.",
        "Preferencat e njoftimeve nuk u ruajtën. Provoni përsëri.",
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell />
          {t("My notifications", "Мои известувања", "Njoftimet e mia")}
        </CardTitle>
        <CardDescription>
          {t(
            "Personal preferences for this studio, synced with OPUS Studio on your phone. Client email and SMS settings are separate.",
            "Лични поставки за ова студио, усогласени со OPUS Studio на телефонот. Поставките за клиентска е-пошта и SMS се одделни.",
            "Preferenca personale për këtë studio, të sinkronizuara me OPUS Studio në telefon. Cilësimet e email-it dhe SMS-it të klientëve janë të veçanta.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>{t("Devices", "Уреди", "Pajisjet")}</FieldLegend>
            <FieldGroup>
              <PreferenceSwitch
                id="push-mobile"
                label={t(
                  "Mobile push",
                  "Известувања на телефон",
                  "Push në telefon",
                )}
                description={t(
                  "Enable each phone from the OPUS Studio app.",
                  "Вклучи го секој телефон преку OPUS Studio апликацијата.",
                  "Aktivizoni çdo telefon nga aplikacioni OPUS Studio.",
                )}
                checked={draft.mobileEnabled}
                disabled={disabled}
                onChange={(value) => set("mobileEnabled", value)}
              />
              <FieldDescription role="status">
                {!settings.mobileAvailable
                  ? t(
                      "Mobile push is currently unavailable. Your preferences will be kept.",
                      "Известувањата на телефон моментално не се достапни. Твоите поставки ќе се зачуваат.",
                      "Push në telefon është aktualisht i padisponueshëm. Preferencat tuaja do të ruhen.",
                    )
                  : draft.mobileEnabled !== settings.preferences.mobileEnabled
                    ? draft.mobileEnabled
                      ? t(
                          "Save your preferences to enable mobile alerts.",
                          "Зачувај ги поставките за да ги вклучиш известувањата на телефон.",
                          "Ruani preferencat për të aktivizuar njoftimet në telefon.",
                        )
                      : t(
                          "Save your preferences to pause mobile alerts.",
                          "Зачувај ги поставките за да ги паузираш известувањата на телефон.",
                          "Ruani preferencat për të pezulluar njoftimet në telefon.",
                        )
                    : !settings.preferences.mobileEnabled
                      ? t(
                          "Mobile alerts are paused. Enable mobile push and save to resume them.",
                          "Известувањата на телефон се паузирани. Вклучи ги и зачувај за да продолжат.",
                          "Njoftimet në telefon janë pezulluar. Aktivizoni push dhe ruani për t'i rifilluar.",
                        )
                      : mobileDevices === 0
                        ? t(
                            "No phone is connected. Open OPUS Studio on your phone and enable notifications there.",
                            "Нема поврзан телефон. Отвори OPUS Studio на телефонот и вклучи ги известувањата таму.",
                            "Nuk ka telefon të lidhur. Hapni OPUS Studio në telefon dhe aktivizoni njoftimet atje.",
                          )
                        : t(
                            `Connected mobile devices: ${mobileDevices}. Phone settings can still pause alerts.`,
                            `Поврзани мобилни уреди: ${mobileDevices}. Поставките на телефонот може да ги паузираат известувањата.`,
                            `Pajisje celulare të lidhura: ${mobileDevices}. Cilësimet e telefonit mund t'i pezullojnë njoftimet.`,
                          )}
              </FieldDescription>
              <PreferenceSwitch
                id="push-browser"
                label={t(
                  "Browser push",
                  "Известувања во прелистувач",
                  "Push në shfletues",
                )}
                description={t(
                  "Receive alerts even when this dashboard tab is closed.",
                  "Добивај известувања и кога табот на контролната табла е затворен.",
                  "Merrni njoftime edhe kur skeda e panelit është mbyllur.",
                )}
                checked={draft.browserEnabled}
                disabled={disabled}
                onChange={(value) => set("browserEnabled", value)}
              />
              <FieldDescription id="push-browser-status" role="status">
                {!browser.checked
                  ? t(
                      "Checking this browser…",
                      "Се проверува прелистувачот…",
                      "Duke kontrolluar shfletuesin…",
                    )
                  : !browser.supported
                    ? t(
                        "Push is unavailable in this browser. On iPhone, add the web dashboard to your Home Screen first.",
                        "Push не е достапен во овој прелистувач. На iPhone, прво додај ја веб контролната табла на почетниот екран.",
                        "Push nuk është i disponueshëm në këtë shfletues. Në iPhone, shtoni panelin në ekranin kryesor së pari.",
                      )
                    : !settings.browserAvailable
                      ? t(
                          "Browser push is not available yet.",
                          "Известувањата во прелистувачот сè уште не се достапни.",
                          "Push në shfletues nuk është ende i disponueshëm.",
                        )
                      : browser.permission === "denied"
                        ? t(
                            "Notifications are blocked in this browser. Allow them in this site's browser settings, then return here to connect.",
                            "Известувањата се блокирани во прелистувачот. Дозволи ги во поставките на прелистувачот за оваа страница, па врати се тука за поврзување.",
                            "Njoftimet janë bllokuar në këtë shfletues. Lejojini në cilësimet e shfletuesit për këtë faqe, pastaj kthehuni këtu për t'u lidhur.",
                          )
                        : needsBrowserSave
                          ? t(
                              "Save your preferences first. Then connect this browser and allow notifications when asked.",
                              "Прво зачувај ги поставките. Потоа поврзи го прелистувачот и дозволи известувања кога ќе биде побарано.",
                              "Ruani preferencat fillimisht. Pastaj lidhni shfletuesin dhe lejoni njoftimet kur të kërkohet.",
                            )
                          : draft.browserEnabled &&
                              !settings.preferences.browserEnabled
                            ? t(
                                "This browser is connected. Save your preferences to resume browser alerts.",
                                "Овој прелистувач е поврзан. Зачувај ги поставките за да продолжат известувањата.",
                                "Ky shfletues është i lidhur. Ruani preferencat për të rifilluar njoftimet e shfletuesit.",
                              )
                            : !settings.preferences.browserEnabled
                              ? t(
                                  "Browser alerts are paused. Turn on browser push and save to resume them.",
                                  "Известувањата во прелистувачот се паузирани. Вклучи ги и зачувај за да продолжат.",
                                  "Njoftimet e shfletuesit janë pezulluar. Aktivizoni push dhe ruani për t'i rifilluar.",
                                )
                              : !draft.browserEnabled
                                ? t(
                                    "Save your preferences to pause browser alerts.",
                                    "Зачувај ги поставките за да ги паузираш известувањата во прелистувачот.",
                                    "Ruani preferencat për të pezulluar njoftimet e shfletuesit.",
                                  )
                                : browser.connected
                                  ? t(
                                      "This browser is connected. Device settings and quiet hours can still pause alerts.",
                                      "Овој прелистувач е поврзан. Поставките на уредот и тивките часови може да ги паузираат известувањата.",
                                      "Ky shfletues është i lidhur. Cilësimet e pajisjes dhe orët e qeta mund t'i pezullojnë njoftimet.",
                                    )
                                  : t(
                                      "Your preference is saved. Connect this browser to allow notifications on this device.",
                                      "Поставката е зачувана. Поврзи го прелистувачот за да дозволиш известувања на овој уред.",
                                      "Preferenca është ruajtur. Lidhni shfletuesin për të lejuar njoftimet në këtë pajisje.",
                                    )}
              </FieldDescription>
              <Field>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto min-h-11 w-full whitespace-normal text-center sm:w-fit"
                  aria-describedby="push-browser-status"
                  disabled={
                    disabled ||
                    !browser.checked ||
                    !browser.supported ||
                    (!browser.connected &&
                      (!settings.browserAvailable ||
                        browser.permission === "denied" ||
                        !draft.browserEnabled))
                  }
                  onClick={() =>
                    void (needsBrowserSave
                      ? submit()
                      : browser.connected
                        ? browser.disconnect()
                        : browser.connect())
                  }
                >
                  {(saving || browser.busy) && (
                    <Spinner data-icon="inline-start" />
                  )}
                  {needsBrowserSave
                    ? t(
                        "Save and continue",
                        "Зачувај и продолжи",
                        "Ruaj dhe vazhdo",
                      )
                    : browser.connected
                      ? t(
                          "Disconnect this browser",
                          "Исклучи го овој прелистувач",
                          "Shkëputni këtë shfletues",
                        )
                      : t(
                          "Connect this browser",
                          "Поврзи го прелистувачот",
                          "Lidhni këtë shfletues",
                        )}
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
          <Disclosure
            title={t(
              "Choose which alerts I receive",
              "Избери кои известувања ги добивам",
              "Zgjidhni cilat njoftime marr",
            )}
          >
            <FieldGroup>
              {!settings.ownOnly && (
                <Field>
                  <FieldLabel htmlFor="push-scope">
                    {t("Appointments", "Термини", "Terminet")}
                  </FieldLabel>
                  <Select
                    value={draft.scope}
                    disabled={disabled}
                    onValueChange={(value) =>
                      set("scope", value as PushPreferences["scope"])
                    }
                  >
                    <SelectTrigger id="push-scope" className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="studio">
                          {t(
                            "All accessible appointments",
                            "Сите дозволени термини",
                            "Të gjitha terminet e lejuara",
                          )}
                        </SelectItem>
                        <SelectItem value="mine">
                          {t(
                            "My appointments",
                            "Мои термини",
                            "Terminet e mia",
                          )}
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {settings.ownOnly && (
                <FieldDescription>
                  {t(
                    "Only your assigned appointments can generate alerts.",
                    "Известувањата се само за твоите доделени термини.",
                    "Vetëm terminet tuaja të caktuara mund të gjenerojnë njoftime.",
                  )}
                </FieldDescription>
              )}
              {PUSH_EVENT_OPTIONS.filter(
                (option) => settings.aiAvailable || option.key !== "aiHandoffs",
              ).map((option) => (
                <PreferenceSwitch
                  key={option.key}
                  id={`push-${option.key}`}
                  label={t(option.en, option.mk, option.sq)}
                  checked={draft[option.key]}
                  disabled={disabled}
                  onChange={(value) => set(option.key, value)}
                />
              ))}
              {draft.reminders && (
                <Field>
                  <FieldLabel htmlFor="push-reminder">
                    {t(
                      "Remind me before",
                      "Потсети ме пред",
                      "Më kujto përpara",
                    )}
                  </FieldLabel>
                  <Select
                    value={String(draft.reminderMinutes)}
                    disabled={disabled}
                    onValueChange={(value) =>
                      set("reminderMinutes", Number(value))
                    }
                  >
                    <SelectTrigger id="push-reminder" className="min-h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PUSH_REMINDER_MINUTES.map((value) => (
                          <SelectItem key={value} value={String(value)}>
                            {value === 1440
                              ? t("1 day", "1 ден", "1 ditë")
                              : value === 60
                                ? t("1 hour", "1 час", "1 orë")
                                : value > 60
                                  ? `${value / 60} ${t("hours", "часа", "orë")}`
                                  : `${value} ${t("minutes", "минути", "minuta")}`}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </FieldGroup>
          </Disclosure>
          <FieldSet>
            <FieldLegend>
              {t(
                "Sound & privacy",
                "Звук и приватност",
                "Tingulli dhe privatësia",
              )}
            </FieldLegend>
            <FieldGroup>
              <PreferenceSwitch
                id="push-sound"
                label={t("Sound", "Звук", "Tingulli")}
                description={t(
                  "Device settings can also mute alerts.",
                  "Поставките на уредот исто така може да го исклучат звукот.",
                  "Cilësimet e pajisjes mund t'i heshtin gjithashtu njoftimet.",
                )}
                checked={draft.sound}
                disabled={disabled}
                onChange={(value) => set("sound", value)}
              />
              <PreferenceSwitch
                id="push-preview"
                label={t(
                  "Show client details in previews",
                  "Прикажи клиентски детали во прегледот",
                  "Shfaq detajet e klientit në pamje paraprake",
                )}
                description={t(
                  "Names and appointment details can appear on your lock screen.",
                  "Имињата и деталите за термините може да се појават на заклучениот екран.",
                  "Emrat dhe detajet e terminit mund të shfaqen në ekranin e kyçur.",
                )}
                checked={draft.showPreview}
                disabled={disabled}
                onChange={(value) => set("showPreview", value)}
              />
              <PreferenceSwitch
                id="push-quiet"
                label={t("Quiet hours", "Тивки часови", "Orët e qeta")}
                description={t(
                  "Pause push alerts during these hours, using the studio’s local time.",
                  "Паузирај ги известувањата во овие часови според локалното време на студиото.",
                  "Pezulloni njoftimet gjatë këtyre orëve sipas kohës lokale të studios.",
                )}
                checked={draft.quietHours}
                disabled={disabled}
                onChange={(value) => set("quietHours", value)}
              />
              {draft.quietHours && (
                <FieldGroup className="sm:grid sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="push-quiet-start">
                      {t("From", "Од", "Nga")}
                    </FieldLabel>
                    <Input
                      id="push-quiet-start"
                      className="min-h-11"
                      type="time"
                      value={draft.quietStart}
                      disabled={disabled}
                      onChange={(event) =>
                        set("quietStart", event.target.value)
                      }
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="push-quiet-end">
                      {t("Until", "До", "Deri")}
                    </FieldLabel>
                    <Input
                      id="push-quiet-end"
                      className="min-h-11"
                      type="time"
                      value={draft.quietEnd}
                      disabled={disabled}
                      onChange={(event) => set("quietEnd", event.target.value)}
                    />
                  </Field>
                </FieldGroup>
              )}
            </FieldGroup>
          </FieldSet>
          {(saveError || browser.error) && (
            <Alert variant="destructive">
              <AlertDescription>{saveError || browser.error}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          className="h-auto min-h-11 w-full whitespace-normal text-center sm:w-auto"
          onClick={() => void submit()}
          disabled={disabled || !isDirty}
        >
          {saving ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          {saving
            ? t("Saving…", "Се зачувува…", "Duke ruajtur…")
            : t("Save preferences", "Зачувај поставки", "Ruaj preferencat")}
        </Button>
        <p className="min-w-0 text-sm text-muted-foreground" role="status">
          {!isWebSocketConnected
            ? t(
                "Reconnecting… Your changes will stay here until you can save.",
                "Се поврзува повторно… Промените остануваат тука додека да можеш да зачуваш.",
                "Duke u rilidhur… Ndryshimet do të mbeten këtu derisa të mund t'i ruani.",
              )
            : isDirty
              ? t(
                  "Unsaved changes",
                  "Незачувани промени",
                  "Ndryshime të paruajtura",
                )
              : saved
                ? t(
                    "Preferences saved",
                    "Поставките се зачувани",
                    "Preferencat u ruajtën",
                  )
                : t(
                    "No unsaved changes",
                    "Нема незачувани промени",
                    "Nuk ka ndryshime të paruajtura",
                  )}
        </p>
      </CardFooter>
    </Card>
  );
}
