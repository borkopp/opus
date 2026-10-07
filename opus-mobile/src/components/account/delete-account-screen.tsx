import { useState } from "react";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { Screen } from "@/components/dashboard/screen";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { LegalLinks } from "./legal-links";
import { backend, errorMessage } from "@/lib/backend";
import { useStudio } from "@/providers/studio-provider";

export function DeleteAccountScreen() {
  const { t, language } = useStudio();
  const status = useQuery(backend.deletionStatus, {});
  const request = useMutation(backend.requestDeletion);
  const { isWebSocketConnected } = useConvexConnectionState();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (busy || !isWebSocketConnected) return;
    setBusy(true); setError(null);
    try { await request({ confirmation: "delete-my-account" }); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return <Screen underHeader>
    <Card>
      {status === undefined ? <Loading /> : status ? <>
        <Text variant="heading">{t("Your deletion request is received", "Барањето за бришење е примено")}</Text>
        <Text>{t("We will process your account and personal data deletion by", "Ќе го обработиме бришењето на твојата сметка и личните податоци до")} {new Date(status.dueAt).toLocaleDateString(language === "mk" ? "mk-MK" : "en-GB", { day: "numeric", month: "long", year: "numeric" })}.</Text>
        <Text tone="muted">{t("You do not need to send an email or make a phone call. We will email you when deletion is complete. Records that must be retained are handled according to our privacy policy.", "Не треба да испраќаш е-пошта или да се јавуваш. Ќе добиеш е-пошта кога бришењето ќе заврши. Записите што мора да се задржат се обработуваат според политиката за приватност.")}</Text>
      </> : <>
        <Text variant="heading">{t("Delete your OPUS account", "Избриши ја твојата OPUS сметка")}</Text>
        <Text>{t("Request permanent deletion of your OPUS account and associated personal data. You will lose access to every studio linked to your account.", "Побарај трајно бришење на твојата OPUS сметка и поврзаните лични податоци. Ќе го изгубиш пристапот до сите студија поврзани со сметката.")}</Text>
        <Text tone="muted">{t("Requests are processed within 30 days. If you own a studio, we will resolve its ownership and subscriptions as part of processing your request. Studio records that must be retained are handled under our privacy policy.", "Барањата се обработуваат во рок од 30 дена. Ако си сопственик на студио, ќе ги разрешиме сопственоста и претплатите при обработката на барањето. Записите од студиото што мора да се задржат се обработуваат според политиката за приватност.")}</Text>
        {confirming && <Text accessibilityRole="alert">{t("Are you sure you want to permanently delete your account and personal data?", "Дали си сигурен дека сакаш трајно да ја избришеш сметката и личните податоци?")}</Text>}
        <Button variant="danger" label={busy ? t("Sending request…", "Се испраќа барањето…") : confirming ? t("Confirm deletion request", "Потврди барање за бришење") : t("Request account deletion", "Побарај бришење на сметката")} disabled={busy || !isWebSocketConnected} onPress={() => confirming ? void submit() : setConfirming(true)} />
        {!isWebSocketConnected && <Text tone="muted">{t("Connect to the internet to send your request.", "Поврзи се на интернет за да го испратиш барањето.")}</Text>}
      </>}
      <Button variant="secondary" label={t("Back", "Назад")} disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace("/")} />
      {error && <Text accessibilityRole="alert">{error}</Text>}
    </Card>
    <LegalLinks />
  </Screen>;
}
