import { Platform } from "react-native";
import { router } from "expo-router";
import { ArrowUpRight } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useExternalLink } from "@/hooks/use-external-link";
import { dashboardUrl } from "@/lib/auth-client";
import { useStudio } from "@/providers/studio-provider";
import { AppointmentModal } from "./appointment-modal";

export function BookingAccessNotice({ owner }: { owner: boolean }) {
  const { t } = useStudio();
  const { openLink, linkError } = useExternalLink();
  return (
    <AppointmentModal title={t("New appointment", "Нов термин")}>
      <Card style={{ borderRadius: 20 }}>
        <Text variant="heading" accessibilityRole="header">
          {t("Your studio's trial has ended", "Пробниот период на студиото заврши")}
        </Text>
        <Text tone="muted">
          {t(
            "New appointments are unavailable. You can still view and manage existing appointments.",
            "Не можеш да додаваш нови термини. Постоечките термини остануваат достапни за прегледување и управување.",
          )}
        </Text>
        <Text tone="muted">
          {owner
            ? t(
                "Manage your studio's subscription on the web dashboard.",
                "Управувај со претплатата на студиото на веб контролната табла.",
              )
            : t(
                "Ask your studio owner to review the subscription.",
                "Побарај од сопственикот на студиото да ја провери претплатата.",
              )}
        </Text>
        {owner && Platform.OS !== "ios" && (
          <Button
            label={t("Open subscription", "Отвори претплата")}
            icon={ArrowUpRight}
            onPress={() => void openLink(`${dashboardUrl}/settings?tab=billing`)}
          />
        )}
        <Button
          variant="secondary"
          label={t("View calendar", "Прегледај календар")}
          onPress={() => router.dismissTo("/calendar")}
        />
        {linkError && <Text accessibilityRole="alert">{linkError}</Text>}
      </Card>
    </AppointmentModal>
  );
}
