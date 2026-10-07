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

export function PushPreferencesCard() {
  const settings = useQuery(api.pushNotifications.getSettings);
  if (!settings) return <Skeleton className="h-64 w-full" />;
  return (
    <PushPreferencesForm
      key={JSON.stringify(settings.preferences)}
      settings={settings}
    />
  );
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
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </Field>
  );
}
function PushPreferencesForm({ settings }: { settings: PushSettings }) {
  const { t } = useDashboardI18n();
  const browser = useBrowserPush(settings);
  const save = useMutation(api.pushNotifications.savePreferences);
  const { isWebSocketConnected } = useConvexConnectionState();
  const [draft, setDraft] = useState<PushPreferences>(settings.preferences);
  const [saving, setSaving] = useState(false);
  const disabled = saving || browser.busy || !isWebSocketConnected;
  const set = <K extends keyof PushPreferences>(
    key: K,
    value: PushPreferences[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  async function submit() {
    if (
      draft.quietHours &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.quietStart) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.quietEnd) ||
        draft.quietStart === draft.quietEnd)
    ) {
      toast.error(
        t(
          "Choose different, valid quiet-hour times.",
          "Избери различни, валидни времиња за тивките часови.",
          "Zgjidhni orare të ndryshme dhe të vlefshme për orët e qeta.",
        ),
      );
      return;
    }
    setSaving(true);
    try {
      await save({
        preferences: draft.quietHours
          ? draft
          : {
              ...draft,
              quietStart: settings.preferences.quietStart,
              quietEnd: settings.preferences.quietEnd,
            },
      });
      toast.success(
        t(
          "Notification preferences saved",
          "Поставките за известувања се зачувани",
          "Preferencat e njoftimeve u ruajtën",
        ),
      );
    } catch {
      toast.error(
        t(
          "Could not save notification preferences. Try again.",
          "Поставките за известувања не се зачуваа. Обиди се повторно.",
          "Preferencat e njoftimeve nuk u ruajtën. Provoni përsëri.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell />
          {t(
            "My push notifications",
            "Мои push известувања",
            "Njoftimet e mia push",
          )}
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
              <FieldDescription>
                {!browser.supported
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
                    : browser.connected
                      ? t(
                          "This browser is connected.",
                          "Овој прелистувач е поврзан.",
                          "Ky shfletues është i lidhur.",
                        )
                      : t(
                          "Connect this browser to receive alerts.",
                          "Поврзи го овој прелистувач за известувања.",
                          "Lidhni këtë shfletues për të marrë njoftime.",
                        )}
              </FieldDescription>
              <Field>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    disabled ||
                    !browser.supported ||
                    !settings.browserAvailable ||
                    (!browser.connected &&
                      (!settings.preferences.browserEnabled ||
                        !draft.browserEnabled))
                  }
                  onClick={() =>
                    void (browser.connected
                      ? browser.disconnect()
                      : browser.connect())
                  }
                >
                  {browser.busy && <Spinner data-icon="inline-start" />}
                  {browser.connected
                    ? t(
                        "Disconnect this browser",
                        "Исклучи го овој прелистувач",
                        "Shkëputni këtë shfletues",
                      )
                    : t(
                        "Enable in this browser",
                        "Вклучи во овој прелистувач",
                        "Aktivizoni në këtë shfletues",
                      )}
                </Button>
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend>
              {t("Which alerts", "Кои известувања", "Cilat njoftime")}
            </FieldLegend>
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
                    <SelectTrigger id="push-scope">
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
                    <SelectTrigger id="push-reminder">
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
          </FieldSet>
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
                  `Skip push alerts during these hours (${settings.timezone}).`,
                  `Не испраќај известувања во овие часови (${settings.timezone}).`,
                  `Mos dërgoni njoftime gjatë këtyre orëve (${settings.timezone}).`,
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
          {browser.error && (
            <Alert variant="destructive">
              <AlertDescription>{browser.error}</AlertDescription>
            </Alert>
          )}
        </FieldGroup>
      </CardContent>
      <CardFooter>
        <Button onClick={() => void submit()} disabled={disabled}>
          {saving ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          {saving
            ? t("Saving…", "Се зачувува…", "Duke ruajtur…")
            : t(
                "Save notification preferences",
                "Зачувај поставки за известувања",
                "Ruaj preferencat e njoftimeve",
              )}
        </Button>
      </CardFooter>
    </Card>
  );
}
