import { View, Pressable } from "react-native";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Plus, Clock3, CalendarDays } from "lucide-react-native";
import { Screen } from "./screen";
import { Brand } from "@/components/ui/brand";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentRow } from "@/components/bookings/appointment-row";
import { backend } from "@/lib/backend";
import { dateLabel, moneyLabel, studioToday } from "@/lib/format";
import { useMinute } from "@/hooks/use-minute";
import { useStudioData } from "@/providers/session-provider";
import { useStudio } from "@/providers/studio-provider";
export function DashboardScreen() {
  const data = useStudioData();
  const { colors, t, language } = useStudio();
  const refreshMinute = useMinute();
  const overview = useQuery(backend.overview, { refreshMinute });
  const today = overview?.today ?? studioToday(data.timezone);
  const appointments = overview?.appointments;
  const next = overview?.next;
  return (
    <Screen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Brand />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Open settings", "Отвори поставки")}
          onPress={() => router.navigate("/settings")}
        >
          <Avatar name={data.profile.name} size={40} tone="peach" />
        </Pressable>
      </View>
      <View style={{ gap: 6 }}>
        <Text variant="caption" tone="muted">
          {dateLabel(today, language, { weekday: "long" })}
        </Text>
        <Text variant="title">
          {t("Your day", "Твојот ден")}, {data.profile.name.split(" ")[0]}
          <Text variant="title" tone="primary">
            .
          </Text>
        </Text>
        <Text tone="muted">{data.name}</Text>
      </View>
      <Button
        label={t("New appointment", "Нов термин")}
        icon={Plus}
        onPress={() => router.push("/appointment/new")}
      />
      {appointments === undefined ? (
        <Loading />
      ) : (
        <>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Card style={{ flex: 1, minWidth: 0 }}>
              <CalendarDays color={colors.muted} size={20} />
              <Text variant="caption" tone="muted">
                {t("Today's appointments", "Денешни термини")}
              </Text>
              <Text variant="metric">{overview!.count}</Text>
              <Text variant="caption" tone="muted">
                {overview!.completedCount} {t("completed", "завршени")}
              </Text>
            </Card>
            <Card
              style={{ flex: 1, minWidth: 0, backgroundColor: colors.primary }}
            >
              <Text variant="caption" tone="inverse">
                {t(
                  "Completed appointment value",
                  "Вредност на завршени термини",
                )}
              </Text>
              {overview!.completedValue.length ? (
                overview!.completedValue.map(
                  ({ currency, amountMinorUnits }) => (
                    <Text key={currency} variant="heading" tone="inverse">
                      {moneyLabel(amountMinorUnits, language, currency)}
                    </Text>
                  ),
                )
              ) : (
                <Text variant="metric" tone="inverse">
                  0
                </Text>
              )}
              <Text variant="caption" tone="inverse">
                {t("Today", "Денес")}
              </Text>
            </Card>
          </View>
          <Card>
            <Text variant="heading">{t("Up next", "Следен термин")}</Text>
            {next ? (
              <AppointmentRow appointment={next} />
            ) : (
              <EmptyState
                icon={Clock3}
                title={t("Room to breathe", "Слободно време")}
                description={t(
                  "No more upcoming appointments today.",
                  "Нема други претстојни термини денес.",
                )}
              />
            )}
          </Card>
          <Card>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text variant="heading">
                {t("Today's schedule", "Денешен распоред")}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.navigate("/calendar")}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text tone="primary">{t("View all", "Види ги сите")}</Text>
              </Pressable>
            </View>
            {appointments.length ? (
              appointments
                .slice(0, 5)
                .map((a) => <AppointmentRow key={a.id} appointment={a} />)
            ) : (
              <Text tone="muted">
                {t("No appointments today.", "Нема термини денес.")}
              </Text>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}
