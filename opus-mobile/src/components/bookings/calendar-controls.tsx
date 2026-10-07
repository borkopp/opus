import { View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button, IconButton, Segmented } from "@/components/ui/button";
import { ChoicePicker } from "@/components/ui/choice-picker";
import { dateLabel } from "@/lib/format";
import { useStudio } from "@/providers/studio-provider";
import { DayPicker } from "./day-picker";

export type CalendarView = "timeline" | "list" | "week" | "month";

export function CalendarControls({
  visible,
  onClose,
  day,
  weekStart,
  onSelectDay,
  onShiftWeek,
  onToday,
  team,
  staffId,
  onSelectStaff,
  view,
  onSelectView,
}: {
  visible: boolean;
  onClose: () => void;
  day: number;
  weekStart: number;
  onSelectDay: (day: number) => void;
  onShiftWeek: (direction: number) => void;
  onToday: () => void;
  team: { id: string; name: string }[];
  staffId?: string;
  onSelectStaff: (staffId: string | undefined) => void;
  view: CalendarView;
  onSelectView: (view: CalendarView) => void;
}) {
  const { t, language } = useStudio();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("Calendar controls", "Поставки на календарот")}
    >
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text variant="heading" style={{ flex: 1 }} numberOfLines={1}>
            {dateLabel(day, language, { day: undefined, year: "numeric" })}
          </Text>
          <IconButton
            icon={ChevronLeft}
            label={t("Previous week", "Претходна недела")}
            onPress={() => onShiftWeek(-1)}
          />
          <IconButton
            icon={ChevronRight}
            label={t("Next week", "Следна недела")}
            onPress={() => onShiftWeek(1)}
          />
        </View>
        <DayPicker start={weekStart} selected={day} onSelect={onSelectDay} />
        <Button
          label={t("Today", "Денес")}
          variant="secondary"
          onPress={onToday}
        />
      </View>
      <View style={{ gap: 10 }}>
        <Text variant="label">{t("Team", "Тим")}</Text>
        <ChoicePicker
          options={[
            { value: "all", label: t("All team", "Цел тим") },
            ...team.map((member) => ({ value: member.id, label: member.name })),
          ]}
          value={staffId ?? "all"}
          onChange={(value) =>
            onSelectStaff(value === "all" ? undefined : value)
          }
        />
      </View>
      <View style={{ gap: 10 }}>
        <Text variant="label">{t("View", "Приказ")}</Text>
        <Segmented
          options={[
            { value: "timeline", label: t("Day", "Ден") },
            { value: "week", label: t("Week", "Недела") },
            { value: "month", label: t("Month", "Месец") },
            { value: "list", label: t("List", "Листа") },
          ]}
          value={view}
          onChange={onSelectView}
        />
      </View>
      <Button label={t("Done", "Готово")} onPress={onClose} />
    </BottomSheet>
  );
}
