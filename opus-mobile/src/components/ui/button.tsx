import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useStudio } from "@/providers/studio-provider";
import { Text } from "./text";

export function Button({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useStudio();
  const color =
    variant === "primary"
      ? colors.primaryText
      : variant === "danger"
        ? colors.danger
        : colors.accentText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      aria-disabled={!!disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            variant === "primary"
              ? colors.primary
              : variant === "danger"
                ? colors.dangerSoft
                : colors.accent,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {Icon && <Icon size={18} color={color} strokeWidth={1.8} />}
      <Text
        variant="label"
        style={{ color, textAlign: "center", flexShrink: 1 }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  filled = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  filled?: boolean;
}) {
  const { colors } = useStudio();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.icon,
        {
          backgroundColor: filled ? colors.primary : colors.card,
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <Icon
        size={21}
        color={filled ? colors.primaryText : colors.foreground}
        strokeWidth={1.8}
      />
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const { colors } = useStudio();
  return (
    <View style={[styles.segments, { backgroundColor: colors.secondary }]}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          accessibilityRole="button"
          disabled={disabled}
          accessibilityState={{ selected: option.value === value, disabled }}
          aria-selected={option.value === value}
          style={({ pressed }) => [
            styles.segment,
            {
              backgroundColor:
                option.value === value ? colors.card : "transparent",
              opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
            },
          ]}
        >
          <Text
            variant="label"
            style={{
              color: option.value === value ? colors.foreground : colors.muted,
              textAlign: "center",
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  segments: { flexDirection: "row", padding: 4, borderRadius: 14, gap: 3 },
  segment: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 7,
    paddingVertical: 10,
    borderRadius: 11,
  },
});
