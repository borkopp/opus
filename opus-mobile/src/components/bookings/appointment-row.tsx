import { Pressable, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { timeLabel } from "@/lib/format";
import { statusLabels } from "@/lib/appointments";
import type { MobileAppointment } from "@/lib/backend";
import { useStudio } from "@/providers/studio-provider";

export function AppointmentRow({
  appointment,
  showTime = true,
}: {
  appointment: MobileAppointment;
  showTime?: boolean;
}) {
  const { colors, localize } = useStudio();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/appointment/[id]",
          params: { id: appointment.id },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`${timeLabel(appointment.startAt)}, ${appointment.customerName}, ${appointment.serviceName}, ${localize(statusLabels[appointment.status])}`}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.65 : 1 }]}
    >
      {showTime && (
        <View style={styles.time}>
          <Text variant="label">{timeLabel(appointment.startAt)}</Text>
          <Text variant="caption" tone="muted">
            {Math.round((appointment.endAt - appointment.startAt) / 60_000)} min
          </Text>
        </View>
      )}
      <View
        style={[
          styles.stripe,
          {
            backgroundColor:
              appointment.status === "completed"
                ? colors.sage
                : appointment.status === "cancelled"
                  ? colors.border
                  : colors.peach,
          },
        ]}
      />
      {!showTime && <Avatar name={appointment.customerName} tone={"peach"} />}
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="label">{appointment.customerName}</Text>
        <Text variant="caption" tone="muted">
          {appointment.serviceName}
        </Text>
        <Text variant="caption" tone="muted">
          {appointment.staffName.split(" ")[0]} ·{" "}
          {localize(statusLabels[appointment.status])}
        </Text>
      </View>
      <ChevronRight size={17} color={colors.muted} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 86,
    gap: 12,
    paddingVertical: 11,
  },
  time: { width: 43, alignSelf: "flex-start", paddingTop: 3, gap: 4 },
  stripe: { width: 3, alignSelf: "stretch", borderRadius: 3 },
});
