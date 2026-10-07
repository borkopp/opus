import { Pressable, StyleSheet, View } from "react-native";
import { ChevronRight, ExternalLink } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useExternalLink } from "@/hooks/use-external-link";
import { publicLinks } from "@/lib/public-links";
import { useStudio } from "@/providers/studio-provider";

export function LegalLinks({ compact = false }: { compact?: boolean }) {
  const { colors, t } = useStudio();
  const { openLink, linkError } = useExternalLink();
  const links = [
    { label: t("Privacy policy", "Политика за приватност"), url: publicLinks.privacy },
    { label: t("Terms of service", "Услови за користење"), url: publicLinks.terms },
    { label: t("Contact support", "Контактирај поддршка"), url: publicLinks.support },
  ];
  const content = <>
    {!compact && <Text variant="heading">{t("Help and legal", "Помош и правни информации")}</Text>}
    <View style={compact ? styles.inline : styles.list}>
      {links.map(({ label, url }) => <Pressable
        key={url}
        accessibilityRole="link"
        accessibilityLabel={label}
        accessibilityHint={t("Opens in your browser.", "Се отвора во прелистувачот.")}
        onPress={() => void openLink(url)}
        style={({ pressed }) => [compact ? styles.compactLink : styles.row, { opacity: pressed ? 0.65 : 1 }]}
      >
        <Text variant={compact ? "caption" : "body"} style={{ color: colors.primary, flexShrink: 1 }}>{label}</Text>
        {!compact && <ChevronRight size={18} color={colors.muted} />}
        {compact && <ExternalLink size={12} color={colors.muted} />}
      </Pressable>)}
    </View>
    {linkError && <Text accessibilityRole="alert">{linkError}</Text>}
  </>;
  return compact ? <View style={{ gap: 8 }}>{content}</View> : <Card>{content}</Card>;
}

const styles = StyleSheet.create({
  inline: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 16 },
  list: { gap: 2 },
  compactLink: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 5 },
  row: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
});
