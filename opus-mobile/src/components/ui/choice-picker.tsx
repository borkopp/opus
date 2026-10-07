import { Pressable, ScrollView } from "react-native";
import { Text } from "./text";
import { useStudio } from "@/providers/studio-provider";

export function ChoicePicker({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { colors } = useStudio();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option.value, disabled }}
          aria-selected={value === option.value}
          aria-disabled={disabled}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 12,
            minHeight: 44,
            borderRadius: 14,
            backgroundColor:
              value === option.value ? colors.accent : colors.secondary,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Text
            variant="label"
            style={{
              color: value === option.value ? colors.accentText : colors.muted,
            }}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
