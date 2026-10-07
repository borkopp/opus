import { View } from "react-native";
import { initials } from "@/lib/format";
import { useStudio } from "@/providers/studio-provider";
import { Text } from "./text";

export function Avatar({
  name,
  tone = "peach",
  size = 44,
}: {
  name: string;
  tone?: "peach" | "lilac" | "sage";
  size?: number;
}) {
  const { colors } = useStudio();
  return (
    <View
      accessibilityLabel={name}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[tone],
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text
        variant="label"
        style={{ fontSize: size * 0.28, color: colors.navy }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
