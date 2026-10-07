import { Pressable, View } from "react-native";
import { useStudio } from "@/providers/studio-provider";
import { Text } from "./text";
export function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { colors } = useStudio();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => ({
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Text variant="label">{label}</Text>
        {description && (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        )}
      </View>
      <View
        style={{
          width: 44,
          height: 26,
          borderRadius: 13,
          padding: 3,
          justifyContent: "center",
          alignItems: value ? "flex-end" : "flex-start",
          backgroundColor: value ? colors.primary : colors.border,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <View
          style={{
            height: 20,
            width: 20,
            borderRadius: 10,
            backgroundColor: colors.card,
          }}
        />
      </View>
    </Pressable>
  );
}
