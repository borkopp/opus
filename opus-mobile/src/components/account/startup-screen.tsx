import { useEffect, useState } from "react";
import { Screen } from "@/components/dashboard/screen";
import { Brand } from "@/components/ui/brand";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Text } from "@/components/ui/text";
import { LegalLinks } from "./legal-links";
import { useStudio } from "@/providers/studio-provider";

export function StartupScreen({ retry, unavailable = false }: { retry?: () => void; unavailable?: boolean }) {
  const { t } = useStudio();
  const [delayed, setDelayed] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setDelayed(true), 12000);
    return () => clearTimeout(timeout);
  }, []);
  return <Screen safeBottom>
    <Brand />
    {unavailable ? <>
      <Text variant="heading">{t("Studio is temporarily unavailable", "Студиото е привремено недостапно")}</Text>
      <Text tone="muted">{t("Please try again later or contact OPUS support.", "Обиди се подоцна или контактирај ја поддршката на OPUS.")}</Text>
    </> : <>
      <Loading />
      <Text tone="muted">{t("Connecting to your studio…", "Се поврзува со твоето студио…")}</Text>
      {delayed && <>
        <Text accessibilityRole="alert">{t("This is taking longer than usual. Check your connection and try again.", "Поврзувањето трае подолго од вообичаено. Провери ја врската и обиди се повторно.")}</Text>
        {retry && <Button variant="secondary" label={t("Try again", "Обиди се повторно")} onPress={retry} />}
      </>}
    </>}
    {(unavailable || delayed) && <LegalLinks compact />}
  </Screen>;
}
