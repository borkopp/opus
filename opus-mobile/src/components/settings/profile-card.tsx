import { StyleSheet, View } from "react-native";
import { Store } from "lucide-react-native";
import type { MobileStudio } from "@/lib/backend";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useStudio } from "@/providers/studio-provider";

export function ProfileCard({
  profile,
  studioName,
  plan,
}: {
  profile: MobileStudio["profile"];
  studioName: string;
  plan: MobileStudio["plan"];
}) {
  const { colors, t } = useStudio();
  const roleLabel = {
    owner: t("Owner", "Сопственик"),
    manager: t("Manager", "Менаџер"),
    staff: t("Staff", "Вработен"),
  }[profile.role];

  return (
    <Card style={styles.card}>
      <View style={styles.identity}>
        <View style={[styles.avatarFrame, { borderColor: colors.border }]}>
          <Avatar name={profile.name} tone="peach" size={64} />
        </View>
        <View style={styles.nameBlock}>
          <Text variant="caption" tone="muted">
            {t("Your profile", "Твојот профил")}
          </Text>
          <Text variant="heading" style={styles.name}>
            {profile.name}
          </Text>
        </View>
      </View>
      <Text selectable tone="muted" style={styles.email}>
        {profile.email}
      </Text>
      <View style={[styles.studio, { borderTopColor: colors.border }]}>
        <View style={styles.studioIdentity}>
          <View style={[styles.studioIcon, { backgroundColor: colors.secondary }]}>
            <Store size={18} color={colors.accentText} strokeWidth={1.8} />
          </View>
          <View style={styles.studioName}>
            <Text variant="caption" tone="muted">
              {t("Studio", "Студио")}
            </Text>
            <Text variant="label">{studioName}</Text>
          </View>
        </View>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Text variant="caption">{roleLabel}</Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: plan === "paid" ? colors.accent : colors.secondary },
            ]}
          >
            <Text
              variant="label"
              style={{ color: plan === "paid" ? colors.accentText : colors.foreground }}
            >
              {plan === "paid" ? "OPUS Pro" : t("Free plan", "Бесплатен план")}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 22 },
  identity: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarFrame: { padding: 4, borderWidth: 1, borderRadius: 40 },
  nameBlock: { flex: 1, minWidth: 0, gap: 4 },
  name: { fontSize: 21, lineHeight: 28, letterSpacing: -0.5 },
  email: { flexShrink: 1 },
  studio: { borderTopWidth: 1, marginTop: 6, paddingTop: 18, gap: 14 },
  studioIdentity: { flexDirection: "row", alignItems: "center", gap: 12 },
  studioIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  studioName: { flex: 1, minWidth: 0, gap: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, justifyContent: "center" },
});
