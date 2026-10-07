import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { Screen } from "@/components/dashboard/screen";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { LegalLinks } from "./legal-links";
import { usePushSignOut } from "@/hooks/use-push-sign-out";
import { useStudio } from "@/providers/studio-provider";

export function RecoveryScreen({
  retry,
}: {
  retry: () => void | Promise<void>;
}) {
  const signOutAccount = usePushSignOut();
  const { t } = useStudio();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const result = await signOutAccount();
      if (result.error) throw new Error();
      await retry();
    } catch {
      setError(
        t(
          "Could not sign out. Check your connection and try again.",
          "Одјавувањето не успеа. Провери ја врската и обиди се повторно.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      safeBottom
      title={t("Could not load your studio", "Студиото не се вчита")}
    >
      <Text>
        {t(
          "Check your connection and try again. If your studio access has changed, sign in again with your current email.",
          "Провери ја врската и обиди се повторно. Ако пристапот до студиото е променет, најави се повторно со актуелната е-пошта.",
        )}
      </Text>
      <Button
        label={t("Try again", "Обиди се повторно")}
        disabled={busy}
        onPress={() => void retry()}
      />
      <Button
        label={t("Sign out", "Одјави се")}
        variant="secondary"
        disabled={busy}
        onPress={() => void signOut()}
      />
      {error && <Text accessibilityRole="alert">{error}</Text>}
      <LegalLinks compact />
    </Screen>
  );
}
