import { useState } from "react";
import { Linking, View } from "react-native";
import { useConvexConnectionState, useMutation } from "convex/react";
import {
  PUSH_EVENT_OPTIONS,
  PUSH_REMINDER_MINUTES,
  type PushPreferences,
  type PushSettings,
} from "../../../../shared/push-notifications";
import { Screen } from "@/components/dashboard/screen";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ToggleRow } from "@/components/ui/toggle-row";
import { ChoicePicker } from "@/components/ui/choice-picker";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { backend } from "@/lib/backend";
import { useStudio } from "@/providers/studio-provider";
import { usePush } from "@/providers/push-provider";

export function NotificationSettingsScreen() {
  const { settings } = usePush();
  const { t } = useStudio();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <Screen underHeader keyboardAvoiding>
      <Text tone="muted">
        {t("Your alerts, on your terms.", "Известувања по твој избор.")}
      </Text>
      {settings ? (
        <NotificationPreferences
          key={JSON.stringify(settings.preferences)}
          data={settings}
          onMessage={setMessage}
        />
      ) : (
        <Loading />
      )}
      {message && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </Screen>
  );
}
function NotificationPreferences({
  data,
  onMessage,
}: {
  data: PushSettings;
  onMessage: (value: string | null) => void;
}) {
  const { t } = useStudio();
  const push = usePush();
  const { isWebSocketConnected } = useConvexConnectionState();
  const [draft, setDraft] = useState<PushPreferences>(data.preferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation(backend.savePushPreferences);
  const disabled = busy || push.busy || !isWebSocketConnected;
  const connected = data.devices.some(
    (device) => device.kind === "expo" && device.id === push.deviceId,
  );
  const set = <K extends keyof PushPreferences>(
    key: K,
    value: PushPreferences[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    onMessage(null);
    setError(null);
  };
  async function submit() {
    if (
      draft.quietHours &&
      (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.quietStart) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.quietEnd) ||
        draft.quietStart === draft.quietEnd)
    ) {
      setError(
        t(
          "Choose different, valid quiet-hour times.",
          "Избери различни, валидни времиња за тивките часови.",
        ),
      );
      return;
    }
    setBusy(true);
    setError(null);
    onMessage(null);
    try {
      await save({
        preferences: draft.quietHours
          ? draft
          : {
              ...draft,
              quietStart: data.preferences.quietStart,
              quietEnd: data.preferences.quietEnd,
            },
      });
      onMessage(
        t(
          "Notification preferences saved.",
          "Поставките за известувања се зачувани.",
        ),
      );
    } catch {
      setError(
        t(
          "Could not save notification preferences. Try again.",
          "Поставките за известувања не се зачуваа. Обиди се повторно.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <Text variant="heading">
          {t("Push delivery", "Испраќање известувања")}
        </Text>
        <Text tone="muted">
          {t(
            "These personal preferences are synced with the web dashboard for this studio.",
            "Овие лични поставки се усогласени со веб контролната табла за ова студио.",
          )}
        </Text>
        <ToggleRow
          label={t("Mobile push", "Известувања на телефон")}
          value={draft.mobileEnabled}
          onChange={(value) => set("mobileEnabled", value)}
          disabled={disabled}
        />
        <ToggleRow
          label={t("Browser push", "Известувања во прелистувач")}
          description={t(
            "Connect each browser from the web dashboard.",
            "Поврзи го секој прелистувач преку веб контролната табла.",
          )}
          value={draft.browserEnabled}
          onChange={(value) => set("browserEnabled", value)}
          disabled={disabled}
        />
        <Text variant="caption" tone="muted">
          {!push.supported
            ? t(
                "Use the installed OPUS Studio app on your phone to enable device alerts.",
                "Користи ја инсталираната OPUS Studio апликација на телефонот за известувања.",
              )
            : !data.mobileAvailable || !push.configured
              ? t(
                  "Mobile push is not available yet.",
                  "Известувањата на телефон сè уште не се достапни.",
                )
              : connected
                ? t("This phone is connected.", "Овој телефон е поврзан.")
                : t(
                    "Enable notifications on this phone to receive alerts.",
                    "Вклучи известувања на овој телефон за да добиваш известувања.",
                  )}
        </Text>
        {connected ? (
          <Button
            label={t("Disconnect this phone", "Исклучи го овој телефон")}
            variant="secondary"
            disabled={disabled}
            onPress={() => void push.disconnect()}
          />
        ) : (
          <Button
            label={t("Enable on this phone", "Вклучи на овој телефон")}
            disabled={
              disabled ||
              !push.supported ||
              !push.configured ||
              !data.mobileAvailable ||
              !data.preferences.mobileEnabled ||
              !draft.mobileEnabled
            }
            onPress={() => void push.enable()}
          />
        )}
        {push.supported && (
          <Button
            label={t(
              "Phone notification settings",
              "Поставки за известувања на телефонот",
            )}
            variant="secondary"
            disabled={disabled}
            onPress={() =>
              void Linking.openSettings().catch(() =>
                setError(
                  t(
                    "Could not open phone settings.",
                    "Поставките на телефонот не се отворија.",
                  ),
                ),
              )
            }
          />
        )}
      </Card>
      <Card>
        <Text variant="heading">{t("Which alerts", "Кои известувања")}</Text>
        {!data.ownOnly && (
          <ChoicePicker
            value={draft.scope}
            onChange={(value) =>
              set("scope", value as PushPreferences["scope"])
            }
            disabled={disabled}
            options={[
              {
                value: "studio",
                label: t(
                  "All accessible appointments",
                  "Сите дозволени термини",
                ),
              },
              { value: "mine", label: t("My appointments", "Мои термини") },
            ]}
          />
        )}
        {data.ownOnly && (
          <Text tone="muted">
            {t(
              "Only your assigned appointments can generate alerts.",
              "Известувањата се само за твоите доделени термини.",
            )}
          </Text>
        )}
        {PUSH_EVENT_OPTIONS.filter(
          (option) => data.aiAvailable || option.key !== "aiHandoffs",
        ).map((option) => (
          <ToggleRow
            key={option.key}
            label={t(option.en, option.mk)}
            value={draft[option.key]}
            disabled={disabled}
            onChange={(value) => set(option.key, value)}
          />
        ))}
        {draft.reminders && (
          <View style={{ gap: 8 }}>
            <Text variant="label">
              {t("Remind me before", "Потсети ме пред")}
            </Text>
            <ChoicePicker
              value={String(draft.reminderMinutes)}
              onChange={(value) => set("reminderMinutes", Number(value))}
              disabled={disabled}
              options={PUSH_REMINDER_MINUTES.map((value) => ({
                value: String(value),
                label:
                  value === 1440
                    ? t("1 day", "1 ден")
                    : value === 60
                      ? t("1 hour", "1 час")
                      : value > 60
                        ? `${value / 60} ${t("hours", "часа")}`
                        : `${value} ${t("min", "мин")}`,
              }))}
            />
          </View>
        )}
      </Card>
      <Card>
        <Text variant="heading">
          {t("Sound & privacy", "Звук и приватност")}
        </Text>
        <ToggleRow
          label={t("Sound", "Звук")}
          description={t(
            "Your phone or browser settings can also mute alerts.",
            "Поставките на телефонот или прелистувачот исто така може да го исклучат звукот.",
          )}
          value={draft.sound}
          disabled={disabled}
          onChange={(value) => set("sound", value)}
        />
        <ToggleRow
          label={t(
            "Show client details in previews",
            "Прикажи клиентски детали во прегледот",
          )}
          description={t(
            "Client names and appointment details can appear on your lock screen.",
            "Имињата на клиентите и деталите за термините може да се појават на заклучениот екран.",
          )}
          value={draft.showPreview}
          disabled={disabled}
          onChange={(value) => set("showPreview", value)}
        />
        <ToggleRow
          label={t("Quiet hours", "Тивки часови")}
          description={t(
            `Skip push alerts during these hours (${data.timezone}).`,
            `Не испраќај известувања во овие часови (${data.timezone}).`,
          )}
          value={draft.quietHours}
          disabled={disabled}
          onChange={(value) => set("quietHours", value)}
        />
        {draft.quietHours && (
          <View style={{ gap: 14 }}>
            <Input
              label={t("From (HH:MM)", "Од (ЧЧ:ММ)")}
              value={draft.quietStart}
              maxLength={5}
              autoCorrect={false}
              editable={!disabled}
              onChangeText={(value) => set("quietStart", value)}
            />
            <Input
              label={t("Until (HH:MM)", "До (ЧЧ:ММ)")}
              value={draft.quietEnd}
              maxLength={5}
              autoCorrect={false}
              editable={!disabled}
              onChangeText={(value) => set("quietEnd", value)}
            />
          </View>
        )}
      </Card>
      {(error || push.error) && (
        <Text accessibilityRole="alert">{error ?? push.error}</Text>
      )}
      <Button
        label={
          busy
            ? t("Saving…", "Се зачувува…")
            : t(
                "Save notification preferences",
                "Зачувај поставки за известувања",
              )
        }
        disabled={disabled}
        onPress={() => void submit()}
      />
    </>
  );
}
