import { useState } from "react";
import { router } from "expo-router";
import { LegalLinks } from "@/components/account/legal-links";
import { useExternalLink } from "@/hooks/use-external-link";
import { Screen } from "@/components/dashboard/screen";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useSession } from "@/providers/session-provider";
import { useStudio } from "@/providers/studio-provider";
import { dashboardUrl } from "@/lib/auth-client";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
export default function NoStudio() {
  const signOutAccount = usePushSignOut();
  const { message } = useSession();
  const { t } = useStudio();
  const { openLink, linkError } = useExternalLink();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const result = await signOutAccount();
      if (result.error) throw new Error();
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
    <Screen safeBottom title={t("Studio access", "Пристап до студио")}>
      <Card>
        <Text>
          {message?.startsWith("No active studio")
            ? t(
                "No active studio access. Ask your studio owner for an invitation or finish setup on the web dashboard.",
                "Немаш активен пристап до студио. Побарај покана од сопственикот или заврши го поставувањето на веб контролната табла.",
              )
            : t(
                "This studio is unavailable in OPUS Studio. Contact support for help.",
                "Ова студио не е достапно во OPUS Studio. Контактирај ја поддршката за помош.",
              )}
        </Text>
        <Button
          label={t("Open web dashboard", "Отвори веб контролна табла")}
          onPress={() => {
            void openLink(dashboardUrl);
          }}
        />
        <Button
          variant="secondary"
          label={t("Sign out", "Одјави се")}
          disabled={busy}
          onPress={() => {
            void signOut();
          }}
        />
      </Card>
      <LegalLinks />
      <Button
        variant="secondary"
        label={t("Delete account", "Избриши сметка")}
        onPress={() => router.push("/account/delete")}
      />
      {(error || linkError) && (
        <Text accessibilityRole="alert">{error || linkError}</Text>
      )}
    </Screen>
  );
}
