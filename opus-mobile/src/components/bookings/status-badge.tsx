import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { statusLabels } from "@/lib/appointments";
import type { BookingStatus } from "@/lib/backend";
import { useStudio } from "@/providers/studio-provider";

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { colors, localize } = useStudio();
  const cancelled = status === "cancelled" || status === "no_show";
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 11,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: cancelled ? colors.dangerSoft : colors.successSoft,
      }}
    >
      <Text
        variant="caption"
        style={{ color: cancelled ? colors.danger : colors.success }}
      >
        {localize(statusLabels[status])}
      </Text>
    </View>
  );
}
