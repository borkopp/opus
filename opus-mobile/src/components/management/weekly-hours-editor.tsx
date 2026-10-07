import { View } from "react-native";
import { Plus, Trash2 } from "lucide-react-native";
import type { WeeklyHours } from "../../../../shared/mobile";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { ToggleRow } from "@/components/ui/toggle-row";
import { Button } from "@/components/ui/button";
import { weekdayLabel } from "@/lib/management";
import { useStudio } from "@/providers/studio-provider";

export function WeeklyHoursEditor({
  value,
  onChange,
  disabled,
}: {
  value: WeeklyHours[];
  onChange: (value: WeeklyHours[]) => void;
  disabled: boolean;
}) {
  const { t, language } = useStudio();
  function update(day: number, patch: Partial<WeeklyHours>) {
    onChange(value.map((d) => (d.dayOfWeek === day ? { ...d, ...patch } : d)));
  }
  return (
    <>
      {[1, 2, 3, 4, 5, 6, 0].map((day) => {
        const rule = value.find((d) => d.dayOfWeek === day)!;
        const label = weekdayLabel(day, language);
        return (
          <Card key={day} style={{ borderRadius: 20, gap: 12 }}>
            <ToggleRow
              label={label}
              description={
                rule.isActive
                  ? t("Working day", "Работен ден")
                  : t("Day off", "Неработен ден")
              }
              value={rule.isActive}
              onChange={(isActive) => update(day, { isActive })}
              disabled={disabled}
            />
            {rule.isActive && (
              <>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={t("Start", "Почеток")}
                      accessibilityLabel={`${label} · ${t("Start", "Почеток")}`}
                      value={rule.startTime}
                      onChangeText={(startTime) => update(day, { startTime })}
                      placeholder="09:00"
                      maxLength={5}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!disabled}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label={t("End", "Крај")}
                      accessibilityLabel={`${label} · ${t("End", "Крај")}`}
                      value={rule.endTime}
                      onChangeText={(endTime) => update(day, { endTime })}
                      placeholder="17:00"
                      maxLength={5}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!disabled}
                    />
                  </View>
                </View>
                {rule.breaks.map((pause, i) => (
                  <View key={i} style={{ gap: 8 }}>
                    <Text variant="label">
                      {t("Break", "Пауза")} {i + 1}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 12 }}>
                      {(["startTime", "endTime"] as const).map((field) => (
                        <View key={field} style={{ flex: 1 }}>
                          <Input
                            label={
                              field === "startTime"
                                ? t("Start", "Почеток")
                                : t("End", "Крај")
                            }
                            accessibilityLabel={`${label} · ${t("Break", "Пауза")} ${i + 1} · ${field === "startTime" ? t("Start", "Почеток") : t("End", "Крај")}`}
                            value={pause[field]}
                            onChangeText={(time) =>
                              update(day, {
                                breaks: rule.breaks.map((b, index) =>
                                  index === i ? { ...b, [field]: time } : b,
                                ),
                              })
                            }
                            maxLength={5}
                            placeholder={
                              field === "startTime" ? "12:00" : "12:30"
                            }
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!disabled}
                          />
                        </View>
                      ))}
                    </View>
                    <Button
                      icon={Trash2}
                      variant="secondary"
                      label={`${t("Remove break", "Отстрани пауза")} ${i + 1}`}
                      disabled={disabled}
                      onPress={() =>
                        update(day, {
                          breaks: rule.breaks.filter((_, index) => index !== i),
                        })
                      }
                    />
                  </View>
                ))}
                <Button
                  icon={Plus}
                  variant="secondary"
                  label={t("Add break", "Додај пауза")}
                  disabled={disabled}
                  onPress={() =>
                    update(day, {
                      breaks: [...rule.breaks, { startTime: "", endTime: "" }],
                    })
                  }
                />
              </>
            )}
          </Card>
        );
      })}
    </>
  );
}
