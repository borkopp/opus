import { Platform, StyleSheet, View } from "react-native";
import { useIsFocused } from "expo-router";
import {
  ArrowUpRight,
  CalendarDays,
  ContactRound,
  Search,
  UsersRound,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ProBadge } from "@/components/ui/pro-badge";
import { useExternalLink } from "@/hooks/use-external-link";
import { dashboardUrl } from "@/lib/auth-client";
import { useStudio } from "@/providers/studio-provider";

export function ClientsProCard({ owner }: { owner: boolean }) {
  const { colors, t } = useStudio();
  const focused = useIsFocused();
  const { openLink, linkError } = useExternalLink();
  const features = [
    {
      icon: Search,
      label: t(
        "Find clients by name, email or phone",
        "Најди клиенти по име, е-пошта или телефон",
      ),
    },
    {
      icon: CalendarDays,
      label: t(
        "See past and upcoming appointments",
        "Прегледај минати и претстојни термини",
      ),
    },
    {
      icon: ContactRound,
      label: t(
        "Keep client contact details together",
        "Сите контакти на клиентите на едно место",
      ),
    },
  ];
  return (
    <Card style={styles.card}>
      <View style={styles.hero}>
        <ProBadge active={focused} />
        <View style={[styles.symbol, { backgroundColor: colors.lilac }]}>
          <UsersRound size={32} color={colors.accentText} strokeWidth={1.5} />
        </View>
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {t("Your clients, in one place", "Твоите клиенти, на едно место")}
        </Text>
        <Text tone="muted" style={styles.description}>
          {t(
            "Get to know the people behind every appointment with OPUS Pro.",
            "Запознај ги луѓето зад секој термин со OPUS Pro.",
          )}
        </Text>
      </View>
      <View style={[styles.features, { borderColor: colors.border }]}>
        {features.map(({ icon: Icon, label }) => (
          <View key={label} style={styles.feature}>
            <Icon size={19} color={colors.primary} strokeWidth={1.8} />
            <Text style={{ flex: 1 }}>{label}</Text>
          </View>
        ))}
      </View>
      {Platform.OS !== "ios" && <View style={{ gap: 10 }}>
        <Button
          label={
            owner
              ? t("Get Pro", "Активирај Pro")
              : t("View subscription", "Прегледај претплата")
          }
          icon={ArrowUpRight}
          onPress={() => void openLink(`${dashboardUrl}/settings?tab=billing`)}
        />
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
          {owner
            ? t(
                "Manage your plan on the web dashboard.",
                "Управувај со планот на веб контролната табла.",
              )
            : t(
                "Your studio owner can activate Pro on the web dashboard.",
                "Сопственикот може да активира Pro на веб контролната табла.",
              )}
        </Text>
        {linkError && <Text accessibilityRole="alert">{linkError}</Text>}
      </View>}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 24, gap: 24, borderRadius: 24 },
  hero: { alignItems: "center", gap: 16, paddingTop: 4 },
  symbol: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  title: { textAlign: "center", fontSize: 26, lineHeight: 33 },
  description: { textAlign: "center", maxWidth: 340 },
  features: {
    gap: 16,
    paddingVertical: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  feature: { flexDirection: "row", alignItems: "center", gap: 12 },
});
