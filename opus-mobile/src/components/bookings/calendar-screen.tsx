import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Plus,
  UsersRound,
} from "lucide-react-native";
import { useQuery } from "convex/react";
import { Screen } from "@/components/dashboard/screen";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { IconButton, Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loading } from "@/components/ui/loading";
import { backend } from "@/lib/backend";
import {
  DAY,
  dateLabel,
  dayFromParam,
  dayOf,
  studioWallClock,
} from "@/lib/format";
import { useStudioData } from "@/providers/session-provider";
import { useStudio } from "@/providers/studio-provider";
import { useMinute } from "@/hooks/use-minute";
import { AppointmentRow } from "./appointment-row";
import { CalendarTimeline } from "./calendar-timeline";
import {
  calendarDays,
  calendarRange,
  calendarWeekStart,
  shiftCalendarPeriod,
} from "../../../../shared/calendar";
import { CalendarMonth } from "./calendar-month";
import { CalendarControls, type CalendarView } from "./calendar-controls";

export function CalendarScreen() {
  const data = useStudioData();
  const { t, language, colors } = useStudio();
  const minute = useMinute();
  const now = useMemo(
    () => studioWallClock(data.timezone, minute * 60_000),
    [data.timezone, minute],
  );
  const today = dayOf(now);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [jumpToNow, setJumpToNow] = useState(0);
  const {
    day: requestedDay,
    week,
    staff,
    view: requestedView,
  } = useLocalSearchParams<{
    day?: string;
    week?: string;
    staff?: string;
    view?: string;
  }>();
  const view: CalendarView =
    requestedView === "week" ||
    requestedView === "month" ||
    requestedView === "list"
      ? requestedView
      : "timeline";
  const setView = (view: CalendarView) => router.setParams({ view });
  const period = view === "week" || view === "month" ? view : "day";
  const day = dayFromParam(requestedDay, today);
  const weekStart = dayFromParam(week, calendarWeekStart(day));
  const range = calendarRange(day, period);
  const weekDays = useMemo(() => calendarDays(day, "week"), [day]);
  const staffId = data.team.some((member) => member.id === staff)
    ? staff
    : undefined;
  const member = data.team.find((member) => member.id === staffId);
  const setDay = (value: number) =>
    router.setParams({
      day: String(value),
      week: String(calendarWeekStart(value)),
    });
  const setStaffId = (value: string | undefined) =>
    router.setParams({ staff: value ?? "all" });
  const result = useQuery(backend.calendar, {
    day: range.startAt,
    endDay: range.endAt,
  });
  const appointments = useMemo(
    () => result?.filter((a) => !staffId || a.staffId === staffId) ?? [],
    [result, staffId],
  );
  const countLabel =
    result === undefined
      ? t("Loading…", "Се вчитува…")
      : `${appointments.length} ${appointments.length === 1 ? t("appointment", "термин") : t("appointments", "термини")}`;
  function newAppointment(startAt?: number) {
    router.push({
      pathname: "/appointment/new",
      params: {
        day: String(startAt === undefined ? day : dayOf(startAt)),
        ...(staffId ? { staff: staffId } : {}),
        ...(startAt !== undefined ? { startAt: String(startAt) } : {}),
      },
    });
  }
  function goToToday() {
    router.setParams({
      day: String(today),
      week: String(calendarWeekStart(today)),
    });
  }
  function goToNow() {
    goToToday();
    if (view !== "week") setView("timeline");
    setJumpToNow((value) => value + 1);
  }
  function shiftWeek(direction: number) {
    router.setParams({
      week: String(weekStart + direction * 7 * DAY),
      day: String(day + direction * 7 * DAY),
    });
  }
  return (
    <Screen
      scroll={false}
      contentStyle={{ gap: 10, paddingTop: 12, paddingBottom: 8 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            t("Choose date", "Избери датум") +
            ", " +
            dateLabel(day, language, { weekday: "long" })
          }
          onPress={() => setControlsOpen(true)}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <View style={{ flexShrink: 1, minWidth: 0 }}>
            <Text variant="heading" numberOfLines={1}>
              {view === "month"
                ? dateLabel(day, language, { day: undefined, year: "numeric" })
                : view === "week"
                  ? `${dateLabel(weekDays[0], language, { month: "short" })}–${dateLabel(weekDays[6], language, { month: "short" })}`
                  : dateLabel(day, language, { month: "short" })}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {countLabel}
            </Text>
          </View>
          <ChevronDown size={16} color={colors.muted} />
        </Pressable>
        <IconButton
          icon={ChevronLeft}
          label={
            period === "month"
              ? t("Previous month", "Претходен месец")
              : period === "week"
                ? t("Previous week", "Претходна недела")
                : t("Previous day", "Претходен ден")
          }
          onPress={() => setDay(shiftCalendarPeriod(day, period, -1))}
        />
        <IconButton
          icon={ChevronRight}
          label={
            period === "month"
              ? t("Next month", "Следен месец")
              : period === "week"
                ? t("Next week", "Следна недела")
                : t("Next day", "Следен ден")
          }
          onPress={() => setDay(shiftCalendarPeriod(day, period, 1))}
        />
        <IconButton
          icon={Plus}
          label={t("New appointment", "Нов термин")}
          filled
          onPress={() => newAppointment()}
        />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            t("Filter team", "Филтрирај тим") +
            ", " +
            (member?.name ?? t("All team", "Цел тим"))
          }
          onPress={() => setControlsOpen(true)}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            borderRadius: 14,
            paddingHorizontal: 10,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.card,
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <UsersRound size={16} color={colors.muted} />
          <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {member?.name.split(" ")[0] ?? t("All team", "Цел тим")}
          </Text>
          <ChevronDown size={14} color={colors.muted} />
        </Pressable>
        <IconButton
          icon={LocateFixed}
          label={t("Now", "Сега")}
          onPress={goToNow}
        />
        <Button
          variant="secondary"
          icon={CalendarDays}
          label={
            view === "week"
              ? t("Week", "Недела")
              : view === "month"
                ? t("Month", "Месец")
                : view === "list"
                  ? t("List", "Листа")
                  : t("Day", "Ден")
          }
          onPress={() => setControlsOpen(true)}
          style={{ minHeight: 44, paddingHorizontal: 10 }}
        />
      </View>
      {result === undefined ? (
        <View style={{ flex: 1 }}>
          <Loading />
        </View>
      ) : view === "month" ? (
        <CalendarMonth
          day={day}
          today={today}
          appointments={appointments}
          onSelectDay={setDay}
          onNewAppointment={() => newAppointment()}
        />
      ) : view === "timeline" || view === "week" ? (
        <CalendarTimeline
          key={view === "week" ? weekDays[0] : day}
          day={day}
          days={view === "week" ? weekDays : undefined}
          onSelectDay={(date) => {
            setDay(date);
            setView("timeline");
          }}
          now={now}
          appointments={appointments}
          teamIds={data.team.map((member) => member.id)}
          jumpToNow={jumpToNow}
          onSelectTime={newAppointment}
        />
      ) : (
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          showsVerticalScrollIndicator={false}
        >
          <Card style={{ gap: 0, paddingVertical: 8 }}>
            {appointments.length ? (
              appointments.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                />
              ))
            ) : (
              <EmptyState
                icon={CalendarDays}
                title={t("A little room to breathe", "Малку слободно време")}
                description={t(
                  "No appointments for this day and team filter.",
                  "Нема термини за избраниот ден и член на тимот.",
                )}
              />
            )}
          </Card>
        </ScrollView>
      )}
      <CalendarControls
        visible={controlsOpen}
        onClose={() => setControlsOpen(false)}
        day={day}
        weekStart={weekStart}
        onSelectDay={setDay}
        onShiftWeek={shiftWeek}
        onToday={goToToday}
        team={data.team}
        staffId={staffId}
        onSelectStaff={setStaffId}
        view={view}
        onSelectView={setView}
      />
    </Screen>
  );
}
