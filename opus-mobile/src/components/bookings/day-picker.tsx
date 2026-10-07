import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";
import { DAY, dateLabel } from "@/lib/format";
import { useStudio } from "@/providers/studio-provider";

export function DayPicker({
  start,
  selected,
  onSelect,
  count = 7,
  disabled = false,
}: {
  start: number;
  selected: number;
  onSelect: (day: number) => void;
  count?: number;
  disabled?: boolean;
}) {
  const { colors, language } = useStudio();
  return (
    <View style={{ flexDirection: "row", gap: 5 }}>
      {Array.from({ length: count }, (_, index) => {
        const day = start + index * DAY;
        const active = selected === day;
        return (
          <Pressable
            key={day}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={dateLabel(day, language, { weekday: "long" })}
            accessibilityState={{ selected: active }}
            aria-selected={active}
            onPress={() => onSelect(day)}
            style={({ pressed }) => [
              {
                flex: 1,
                minWidth: 0,
                minHeight: 76,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: active ? colors.primary : colors.card,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{
                color: active ? colors.primaryText : colors.muted,
                fontSize: 10,
              }}
              numberOfLines={1}
            >
              {dateLabel(day, language, {
                weekday: "short",
                day: undefined,
                month: undefined,
              }).replace(/\.$/, "")}
            </Text>
            <Text
              variant="heading"
              style={{ color: active ? colors.primaryText : colors.foreground }}
            >
              {new Date(day).getUTCDate()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
