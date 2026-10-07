import { View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useStudio } from "@/providers/studio-provider";
import { Text } from "./text";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  const { colors } = useStudio();
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 36,
        paddingHorizontal: 20,
        gap: 10,
      }}
    >
      <Icon size={32} color={colors.muted} strokeWidth={1.5} />
      <Text variant="heading" style={{ textAlign: "center" }}>
        {title}
      </Text>
      <Text tone="muted" style={{ textAlign: "center", maxWidth: 300 }}>
        {description}
      </Text>
    </View>
  );
}
