import { Pressable, View } from "react-native";
import { Check, Plus } from "lucide-react-native";
import { useStudio } from "@/providers/studio-provider";
import { Text } from "./text";
export function SelectionList({
  options,
  value,
  onChange,
  disabled = false,
}: {
  options: { value: string; label: string; description?: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const { colors } = useStudio();
  return (
    <View style={{ gap: 8 }}>
      {options.map((option) => {
        const selected = value.includes(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="checkbox"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected, disabled }}
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            onPress={() =>
              onChange(
                selected
                  ? value.filter((v) => v !== option.value)
                  : [...value, option.value],
              )
            }
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              minHeight: 54,
              borderRadius: 14,
              backgroundColor: selected ? colors.accent : colors.secondary,
              opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="label">{option.label}</Text>
              {option.description && (
                <Text variant="caption" tone="muted">
                  {option.description}
                </Text>
              )}
            </View>
            {selected ? (
              <Check size={19} color={colors.primary} />
            ) : (
              <Plus size={19} color={colors.muted} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
