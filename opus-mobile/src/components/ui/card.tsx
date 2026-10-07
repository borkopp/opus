import { View, StyleSheet, type ViewProps } from "react-native";
import { useStudio } from "@/providers/studio-provider";

export function Card({ style, ...props }: ViewProps) {
  const { colors } = useStudio();
  return (
    <View
      {...props}
      style={[styles.card, { backgroundColor: colors.card }, style]}
    />
  );
}
const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 24, gap: 16 },
});
