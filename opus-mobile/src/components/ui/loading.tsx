import { ActivityIndicator, View } from "react-native";
import { Text } from "./text";
import { useStudio } from "@/providers/studio-provider";
export function Loading() {
  const { colors, t } = useStudio();
  return (
    <View style={{ padding: 28, gap: 12, alignItems: "center" }}>
      <ActivityIndicator color={colors.primary} />
      <Text tone="muted">
        {t("Loading your studio…", "Се вчитува студиото…")}
      </Text>
    </View>
  );
}
