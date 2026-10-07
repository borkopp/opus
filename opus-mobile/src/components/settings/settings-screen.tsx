import { useState } from "react";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useConvexConnectionState, useMutation } from "convex/react";
import { Screen } from "@/components/dashboard/screen";
import { ProfileCard } from "./profile-card";
import { LegalLinks } from "@/components/account/legal-links";
import { useExternalLink } from "@/hooks/use-external-link";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Button, Segmented } from "@/components/ui/button";
import { backend, errorMessage } from "@/lib/backend";
import { dashboardUrl } from "@/lib/auth-client";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
import { useStudio } from "@/providers/studio-provider";
import { useStudioData } from "@/providers/session-provider";
export function SettingsScreen() {
  const data = useStudioData();
  const signOutAccount = usePushSignOut();
  const { openLink, linkError } = useExternalLink();
  const { isWebSocketConnected } = useConvexConnectionState();
  const { theme, language, setTheme, setLanguage, t } = useStudio();
  const saveTheme = useMutation(backend.theme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function chooseTheme(value: "clarity" | "studio") {
    if (busy || !isWebSocketConnected || value === theme) return;
    setBusy(true);
    setError(null);
    try {
      await saveTheme({ theme: value });
      setTheme(value);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await signOutAccount();
      if (result.error) throw new Error(result.error.message);
    } catch {
      setError(
        t(
          "Could not sign out. Try again.",
          "Одјавувањето не успеа. Обиди се повторно.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={t("Settings", "Поставки")}
      subtitle={t("Make yourself at home.", "Уреди по свој вкус.")}
    >
      <ProfileCard
        profile={data.profile}
        studioName={data.name}
        plan={data.plan}
      />
      <Card>
        <Text variant="heading">{t("Appearance", "Изглед")}</Text>
        <Text tone="muted">
          {t(
            "Synced with your web dashboard.",
            "Усогласено со веб контролната табла.",
          )}
        </Text>
        <Segmented
          value={theme}
          disabled={busy || !isWebSocketConnected}
          onChange={(value) => void chooseTheme(value)}
          options={[
            { value: "clarity", label: "Clarity" },
            { value: "studio", label: "Studio" },
          ]}
        />
      </Card>
      <Card>
        <Text variant="heading">{t("Language", "Јазик")}</Text>
        <Segmented
          value={language}
          onChange={setLanguage}
          options={[
            { value: "en", label: "English" },
            { value: "mk", label: "Македонски" },
          ]}
        />
      </Card>
      <LegalLinks />
      <Button
        variant="secondary"
        label={t("Notification preferences", "Поставки за известувања")}
        onPress={() => router.push("/notifications/preferences")}
      />
      <Button
        variant="secondary"
        label={t("Open web dashboard", "Отвори веб контролна табла")}
        onPress={() => void openLink(dashboardUrl)}
      />
      <Button
        variant="danger"
        label={t("Sign out", "Одјави се")}
        disabled={busy}
        onPress={() => void signOut()}
      />
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {linkError && <Text accessibilityRole="alert">{linkError}</Text>}
      <Button
        variant="secondary"
        label={t("Delete account", "Избриши сметка")}
        onPress={() => router.push("/account/delete")}
      />
      <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
        OPUS Studio · {Constants.expoConfig?.version ?? "1.0.1"}
      </Text>
    </Screen>
  );
}
