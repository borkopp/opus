import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router, useIsFocused } from "expo-router";
import { Text } from "@/components/ui/text";
import { useStudio } from "@/providers/studio-provider";
import type { MobileAppointment } from "@/lib/backend";
import { statusLabels } from "@/lib/appointments";
import { dateLabel, dayOf, timeLabel } from "@/lib/format";
import {
  HOUR_HEIGHT,
  TIMELINE_HEIGHT,
  TIMELINE_INSET,
  timelineBlocks,
  timelineScrollOffset,
} from "@/lib/calendar-timeline";

export function CalendarTimeline({
  day,
  days,
  onSelectDay,
  now,
  appointments,
  teamIds,
  jumpToNow,
  onSelectTime,
}: {
  day: number;
  days?: number[];
  onSelectDay?: (day: number) => void;
  now: number;
  appointments: MobileAppointment[];
  teamIds: string[];
  jumpToNow: number;
  onSelectTime: (startAt: number) => void;
}) {
  const { colors, t, localize, language } = useStudio();
  const focused = useIsFocused();
  const scroll = useRef<ScrollView>(null);
  const [scrollY] = useState(() => new Animated.Value(0));
  const horizontal = useRef<ScrollView>(null);
  const [frameWidth, setFrameWidth] = useState(0);
  const weekly = Boolean(days);
  const displayDays = useMemo(() => days ?? [day], [days, day]);
  const canvasWidth = weekly
    ? Math.max(frameWidth - 54, displayDays.length * 110)
    : Math.max(0, frameWidth - 54);
  const columnWidth = canvasWidth / displayDays.length;
  const positioned = useRef<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const columns = useMemo(
    () =>
      displayDays.map((columnDay) => ({
        day: columnDay,
        blocks: timelineBlocks(appointments, columnDay),
      })),
    [appointments, displayDays],
  );
  useEffect(() => {
    if (weekly && frameWidth)
      horizontal.current?.scrollTo({
        x: Math.max(0, displayDays.indexOf(day) * columnWidth - 30),
        animated: false,
      });
  }, [day, displayDays, columnWidth, frameWidth, weekly, jumpToNow]);
  const onContentSizeChange = useCallback(
    (_width: number, height: number) => setContentHeight(height),
    [],
  );
  useEffect(() => {
    if (!focused) {
      return;
    }
    if (!viewportHeight || !contentHeight || !scroll.current) return;
    const key = `${day}:${jumpToNow}`;
    if (positioned.current === key) return;
    positioned.current = key;
    scroll.current.scrollTo({
      y: timelineScrollOffset(day, now, appointments, viewportHeight),
      animated: false,
    });
    // Live updates and clock ticks move the marker, never the user's viewport.
  }, [
    appointments,
    contentHeight,
    day,
    focused,
    jumpToNow,
    now,
    viewportHeight,
  ]);
  const tones = [colors.peach, colors.lilac, colors.sage, colors.accent];

  return (
    <View
      onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
      style={[
        styles.frame,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <ScrollView
        ref={horizontal}
        horizontal
        scrollEnabled={weekly}
        style={{ flex: 1, marginLeft: 54 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsHorizontalScrollIndicator={weekly}
        testID={weekly ? "calendar-week-scroll" : undefined}
      >
        <View style={{ width: canvasWidth, flex: 1 }}>
          {weekly && (
            <View style={{ flexDirection: "row", height: 52 }}>
              {displayDays.map((columnDay) => (
                <Pressable
                  key={columnDay}
                  accessibilityRole="button"
                  accessibilityLabel={
                    t("Open day", "Отвори ден") +
                    ", " +
                    dateLabel(columnDay, language, { weekday: "long" })
                  }
                  onPress={() => onSelectDay?.(columnDay)}
                  style={{
                    width: columnWidth,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    backgroundColor:
                      columnDay === dayOf(now) ? colors.accent : colors.card,
                    borderRightWidth: StyleSheet.hairlineWidth,
                    borderRightColor: colors.border,
                  }}
                >
                  <Text variant="caption" tone="muted">
                    {dateLabel(columnDay, language, {
                      weekday: "short",
                      day: undefined,
                      month: undefined,
                    })}
                  </Text>
                  <Text
                    variant="label"
                    tone={columnDay === dayOf(now) ? "primary" : "default"}
                  >
                    {new Date(columnDay).getUTCDate()}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <Animated.ScrollView
            ref={scroll}
            testID={weekly ? "calendar-week-timeline" : "calendar-timeline"}
            style={styles.scroll}
            onLayout={(event) =>
              setViewportHeight(event.nativeEvent.layout.height)
            }
            onContentSizeChange={onContentSizeChange}
            showsVerticalScrollIndicator
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: Platform.OS !== "web" },
            )}
            contentContainerStyle={{ height: TIMELINE_HEIGHT }}
          >
            {columns.map(({ day: columnDay, blocks }, columnIndex) => {
              const currentMinute = (now - columnDay) / 60_000;
              const isToday = dayOf(now) === columnDay;
              return (
                <View
                  key={columnDay}
                  pointerEvents="box-none"
                  style={{
                    position: "absolute",
                    left: columnIndex * columnWidth,
                    width: columnWidth,
                    height: TIMELINE_HEIGHT,
                    borderRightWidth: weekly ? StyleSheet.hairlineWidth : 0,
                    borderRightColor: colors.border,
                  }}
                >
                  <View style={[styles.grid, { left: 0, right: 0 }]}>
                    {Array.from({ length: 48 }, (_, index) => {
                      const startAt = columnDay + index * 30 * 60_000;
                      const past = startAt < now;
                      return (
                        <Pressable
                          key={index}
                          accessibilityRole="button"
                          accessibilityLabel={
                            (weekly
                              ? dateLabel(columnDay, language, {
                                  weekday: "short",
                                }) + ", "
                              : "") +
                            t("Start booking at", "Започни термин во") +
                            " " +
                            timeLabel(startAt)
                          }
                          disabled={past}
                          accessibilityState={{ disabled: past }}
                          aria-disabled={past}
                          onPress={() => onSelectTime(startAt)}
                          style={({ pressed }) => ({
                            height: HOUR_HEIGHT / 2,
                            borderTopWidth:
                              index % 2 === 0 ? 1 : StyleSheet.hairlineWidth,
                            borderTopColor: colors.border,
                            borderStyle: index % 2 === 0 ? "solid" : "dashed",
                            backgroundColor: pressed
                              ? colors.accent
                              : "transparent",
                          })}
                        />
                      );
                    })}
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                      }}
                    />
                  </View>
                  <View
                    pointerEvents="box-none"
                    style={[styles.events, { left: 0, right: 0 }]}
                  >
                    {blocks.map(({ appointment, top, height, lane, lanes }) => {
                      const inactive =
                        appointment.status === "cancelled" ||
                        appointment.status === "no_show";
                      const completed = appointment.status === "completed";
                      const tone =
                        tones[
                          Math.max(0, teamIds.indexOf(appointment.staffId)) %
                            tones.length
                        ];
                      const background = inactive
                        ? colors.secondary
                        : completed
                          ? colors.successSoft
                          : tone;
                      return (
                        <View
                          key={appointment.id}
                          pointerEvents="box-none"
                          style={{
                            position: "absolute",
                            top,
                            height,
                            left: `${(lane / lanes) * 100}%`,
                            width: `${100 / lanes}%`,
                            paddingHorizontal: 3,
                          }}
                        >
                          <Pressable
                            testID={`calendar-appointment-${appointment.id}`}
                            accessibilityRole="button"
                            accessibilityLabel={`${timeLabel(appointment.startAt)}, ${appointment.customerName}, ${appointment.serviceName}, ${appointment.staffName}, ${localize(statusLabels[appointment.status])}`}
                            onPress={() =>
                              router.push({
                                pathname: "/appointment/[id]",
                                params: { id: appointment.id },
                              })
                            }
                            style={({ pressed }) => [
                              styles.event,
                              {
                                backgroundColor: background,
                                borderLeftColor: inactive
                                  ? colors.muted
                                  : completed
                                    ? colors.success
                                    : colors.primary,
                                opacity: pressed ? 0.7 : 1,
                              },
                            ]}
                          >
                            <Text
                              variant="label"
                              numberOfLines={1}
                              style={{
                                fontSize: 12,
                                lineHeight: 17,
                                textDecorationLine: inactive
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {appointment.customerName}
                            </Text>
                            <Text
                              variant="caption"
                              numberOfLines={1}
                              style={{ fontSize: 10, lineHeight: 15 }}
                            >
                              {timeLabel(appointment.startAt)}
                              {lanes < 3
                                ? `–${timeLabel(appointment.endAt)}`
                                : ""}
                            </Text>
                            {height >= 76 && (
                              <Text variant="caption" numberOfLines={1}>
                                {appointment.serviceName}
                              </Text>
                            )}
                            {height >= 100 && (
                              <Text
                                variant="caption"
                                tone="muted"
                                numberOfLines={1}
                              >
                                {appointment.staffName.split(" ")[0]} ·{" "}
                                {localize(statusLabels[appointment.status])}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                  {isToday && (
                    <View
                      testID="calendar-now-marker"
                      pointerEvents="none"
                      accessibilityLabel={
                        t(
                          "Current studio time",
                          "Моментално време во студиото",
                        ) +
                        " " +
                        timeLabel(now)
                      }
                      style={[
                        styles.now,
                        {
                          top:
                            TIMELINE_INSET +
                            (currentMinute * HOUR_HEIGHT) / 60 -
                            10,
                          left: 0,
                          right: 0,
                        },
                      ]}
                    >
                      {weekly && (
                        <View
                          style={[
                            styles.nowLabel,
                            { backgroundColor: colors.danger },
                          ]}
                        >
                          <Text
                            variant="caption"
                            style={{
                              color: colors.primaryText,
                              fontSize: 10,
                              lineHeight: 16,
                              fontVariant: ["tabular-nums"],
                            }}
                          >
                            {timeLabel(now)}
                          </Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.nowDot,
                          { backgroundColor: colors.danger },
                        ]}
                      />
                      <View
                        style={{
                          flex: 1,
                          height: 1.5,
                          backgroundColor: colors.danger,
                        }}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </Animated.ScrollView>
        </View>
      </ScrollView>
      <View
        pointerEvents="none"
        testID="calendar-time-rail"
        style={{
          position: "absolute",
          top: weekly ? 52 : 0,
          bottom: 0,
          left: 0,
          width: 54,
          overflow: "hidden",
          backgroundColor: colors.card,
        }}
      >
        <Animated.View
          style={{
            height: TIMELINE_HEIGHT,
            transform: [{ translateY: Animated.multiply(scrollY, -1) }],
          }}
        >
          {Array.from({ length: 25 }, (_, hour) => (
            <View
              key={hour}
              style={[
                styles.hourLabel,
                { top: TIMELINE_INSET + hour * HOUR_HEIGHT - 9 },
              ]}
            >
              <Text variant="caption" tone="muted" style={styles.hourText}>
                {String(hour).padStart(2, "0")}:00
              </Text>
            </View>
          ))}
          {!weekly && dayOf(now) === day && (
            <View
              style={[
                styles.nowLabel,
                {
                  position: "absolute",
                  left: 2,
                  top:
                    TIMELINE_INSET +
                    ((now - day) / 3_600_000) * HOUR_HEIGHT -
                    10,
                  backgroundColor: colors.danger,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: colors.primaryText,
                  fontSize: 10,
                  lineHeight: 16,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {timeLabel(now)}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 0,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
  },
  scroll: { flex: 1 },
  hourLabel: { position: "absolute", left: 3, width: 44, alignItems: "center" },
  hourText: { fontSize: 10, fontVariant: ["tabular-nums"] },
  grid: { position: "absolute", top: TIMELINE_INSET, left: 54, right: 8 },
  events: {
    position: "absolute",
    top: 0,
    left: 54,
    right: 8,
    height: TIMELINE_HEIGHT,
  },
  event: {
    flex: 1,
    borderRadius: 10,
    borderLeftWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    overflow: "hidden",
  },
  now: {
    position: "absolute",
    left: 2,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    height: 20,
  },
  nowLabel: {
    width: 45,
    borderRadius: 6,
    alignItems: "center",
    paddingVertical: 2,
    marginRight: 6,
  },
  nowDot: { width: 6, height: 6, borderRadius: 3 },
});
