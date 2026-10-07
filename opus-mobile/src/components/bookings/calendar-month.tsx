import { Pressable, ScrollView, View } from "react-native";
import { CalendarDays, Plus } from "lucide-react-native";
import {
  calendarDays,
  calendarDay,
  calendarMonthStart,
} from "../../../../shared/calendar";
import type { MobileAppointment } from "@/lib/backend";
import { dateLabel } from "@/lib/format";
import { useStudio } from "@/providers/studio-provider";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentRow } from "./appointment-row";

export function CalendarMonth({
  day,
  today,
  appointments,
  onSelectDay,
  onNewAppointment,
}: {
  day: number;
  today: number;
  appointments: MobileAppointment[];
  onSelectDay: (day: number) => void;
  onNewAppointment: () => void;
}) {
  const { colors, language, t } = useStudio();
  const days = calendarDays(day, "month");
  const counts = new Map<number, number>();
  for (const appointment of appointments) {
    const date = calendarDay(appointment.startAt);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  const selected = appointments.filter((a) => calendarDay(a.startAt) === day);
  return (
    <ScrollView
      testID="calendar-month"
      style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={{ gap: 16, paddingBottom: 12 }}
    >
      <Card style={{ padding: 10, gap: 4 }}>
        <View style={{ flexDirection: "row" }}>
          {days.slice(0, 7).map((date) => (
            <Text
              key={date}
              variant="caption"
              tone="muted"
              style={{
                width: `${100 / 7}%`,
                textAlign: "center",
                paddingVertical: 6,
              }}
            >
              {dateLabel(date, language, {
                weekday: "short",
                day: undefined,
                month: undefined,
              })}
            </Text>
          ))}
        </View>
        {Array.from({ length: days.length / 7 }, (_, row) => (
          <View key={row} style={{ flexDirection: "row" }}>
            {days.slice(row * 7, row * 7 + 7).map((date) => {
              const count = counts.get(date) ?? 0;
              const isSelected = date === day;
              const outside =
                calendarMonthStart(date) !== calendarMonthStart(day);
              return (
                <Pressable
                  key={date}
                  testID={`calendar-month-day-${date}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  aria-selected={isSelected}
                  accessibilityLabel={`${dateLabel(date, language, { weekday: "long", year: "numeric" })}, ${count} ${t("appointments", "термини")}`}
                  onPress={() => onSelectDay(date)}
                  style={({ pressed }) => ({
                    width: `${100 / 7}%`,
                    minHeight: 54,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    borderRadius: 14,
                    backgroundColor: isSelected
                      ? colors.primary
                      : date === today
                        ? colors.accent
                        : "transparent",
                    opacity: pressed ? 0.65 : 1,
                  })}
                >
                  <Text
                    variant="label"
                    style={{
                      color: isSelected
                        ? colors.primaryText
                        : outside
                          ? colors.muted
                          : colors.foreground,
                    }}
                  >
                    {new Date(date).getUTCDate()}
                  </Text>
                  <Text
                    variant="caption"
                    style={{
                      fontSize: 10,
                      lineHeight: 12,
                      color: isSelected
                        ? colors.primaryText
                        : colors.accentText,
                    }}
                  >
                    {count > 0 ? String(count) : " "}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text variant="heading" style={{ flex: 1 }}>
          {dateLabel(day, language, { weekday: "short", month: "short" })}
        </Text>
        <Button
          label={t("Add", "Додај")}
          icon={Plus}
          variant="secondary"
          onPress={onNewAppointment}
        />
      </View>
      <Card style={{ gap: 0, paddingVertical: 8 }}>
        {selected.length ? (
          selected.map((a) => <AppointmentRow key={a.id} appointment={a} />)
        ) : (
          <EmptyState
            icon={CalendarDays}
            title={t("An open day", "Слободен ден")}
            description={t(
              "No appointments for this day and team filter.",
              "Нема термини за избраниот ден и член на тимот.",
            )}
          />
        )}
      </Card>
    </ScrollView>
  );
}
