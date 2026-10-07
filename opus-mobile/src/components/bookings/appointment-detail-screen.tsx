import { useState } from "react";
import { Linking, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import {
  Ban,
  CalendarDays,
  Check,
  Clock3,
  UsersRound,
  UserRoundX,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { StatusBadge } from "./status-badge";
import { backend, errorMessage, type BookingStatus } from "@/lib/backend";
import { dateLabel, dayOf, moneyLabel, timeLabel } from "@/lib/format";
import { useStudio } from "@/providers/studio-provider";
import { useStudioData } from "@/providers/session-provider";
import { AppointmentModal } from "./appointment-modal";
export function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, colors } = useStudio();
  const data = useStudioData();
  const { isWebSocketConnected } = useConvexConnectionState();
  const appointment = useQuery(
    backend.appointment,
    id ? { bookingId: id } : "skip",
  );
  const update = useMutation(backend.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"cancelled" | "no_show" | null>(null);
  async function change(
    status: Exclude<BookingStatus, "confirmed" | "checked_in">,
  ) {
    if (!appointment || busy || !isWebSocketConnected) return;
    setBusy(true);
    setError(null);
    try {
      await update({ bookingId: appointment.id, status });
      setConfirm(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (appointment === undefined)
    return (
      <AppointmentModal title={t("Appointment", "Термин")}>
        <Loading />
      </AppointmentModal>
    );
  if (!appointment)
    return (
      <AppointmentModal title={t("Appointment", "Термин")}>
        <Text>{t("Appointment unavailable.", "Терминот не е достапен.")}</Text>
      </AppointmentModal>
    );
  const active = ["confirmed", "checked_in"].includes(appointment.status);
  return (
    <AppointmentModal
      title={t("Appointment", "Термин")}
      busy={busy}
      day={dayOf(appointment.startAt)}
      footer={
        active ? (
          confirm ? (
            <>
              <Button
                variant="danger"
                label={
                  busy
                    ? t("Saving…", "Се зачувува…")
                    : confirm === "cancelled"
                      ? t("Confirm cancellation", "Потврди откажување")
                      : t("Confirm no-show", "Потврди непојавување")
                }
                disabled={busy || !isWebSocketConnected}
                onPress={() => void change(confirm)}
              />
              <Button
                variant="secondary"
                label={t("Keep appointment", "Задржи го терминот")}
                disabled={busy}
                onPress={() => setConfirm(null)}
              />
            </>
          ) : (
            <Button
              icon={Check}
              label={
                busy
                  ? t("Saving…", "Се зачувува…")
                  : t("Complete appointment", "Заврши термин")
              }
              disabled={busy || !isWebSocketConnected}
              onPress={() => void change("completed")}
            />
          )
        ) : undefined
      }
    >
      <Card style={{ borderRadius: 20 }}>
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 8 }}>
          <Avatar name={appointment.customerName} tone="peach" size={56} />
          <View style={{ gap: 4 }}>
            <Text
              variant="heading"
              style={{ fontSize: 24, lineHeight: 30, textAlign: "center" }}
            >
              {appointment.customerName}
            </Text>
            <Text tone="muted" style={{ textAlign: "center" }}>
              {appointment.serviceName}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <StatusBadge status={appointment.status} />
          <Text variant="heading" style={{ fontSize: 20 }}>
            {moneyLabel(
              appointment.priceMinorUnits,
              language,
              appointment.currency,
            )}
          </Text>
        </View>
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 14,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <CalendarDays size={18} color={colors.muted} />
            <Text variant="label" style={{ flex: 1 }}>
              {dateLabel(appointment.startAt, language, { weekday: "long" })}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Clock3 size={18} color={colors.muted} />
            <Text style={{ flex: 1 }}>
              {timeLabel(appointment.startAt)}–{timeLabel(appointment.endAt)} ·{" "}
              {Math.round((appointment.endAt - appointment.startAt) / 60_000)}{" "}
              min
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <UsersRound size={18} color={colors.muted} />
            <Text tone="muted" style={{ flex: 1 }}>
              {appointment.staffName}
            </Text>
          </View>
          {appointment.note && <Text tone="muted">{appointment.note}</Text>}
          {!appointment.customerEmail &&
            !appointment.customerPhone &&
            data.plan !== "paid" && (
              <Text variant="caption" tone="muted">
                {t("No contact details added.", "Нема додаден контакт.")}
              </Text>
            )}
        </View>
      </Card>
      {(appointment.customerEmail ||
        appointment.customerPhone ||
        data.plan === "paid") && (
        <Card style={{ borderRadius: 20 }}>
          <Text variant="heading">{t("Client", "Клиент")}</Text>
          {appointment.customerEmail && (
            <Text>{appointment.customerEmail}</Text>
          )}
          {appointment.customerPhone && (
            <Button
              variant="secondary"
              label={`${t("Call", "Јави се")} ${appointment.customerPhone}`}
              onPress={() =>
                void Linking.openURL(
                  `tel:${encodeURIComponent(appointment.customerPhone!)}`,
                ).catch(() =>
                  setError(
                    t("Could not open phone.", "Телефонот не се отвори."),
                  ),
                )
              }
            />
          )}
          {data.plan === "paid" && data.profile.bookingAccess !== "own" && (
            <Button
              variant="secondary"
              label={t("View client", "Прегледај клиент")}
              onPress={() =>
                router.dismissTo({
                  pathname: "/client/[id]",
                  params: { id: appointment.customerId },
                })
              }
            />
          )}
          {!appointment.customerEmail && !appointment.customerPhone && (
            <Text tone="muted">
              {t("No contact details added.", "Нема додаден контакт.")}
            </Text>
          )}
        </Card>
      )}
      {active && (
        <Card style={{ borderRadius: 20, gap: 12 }}>
          <Text variant="heading">
            {t("Appointment actions", "Дејства за терминот")}
          </Text>
          {!confirm && (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                variant="danger"
                icon={Ban}
                style={{ flex: 1, paddingHorizontal: 10 }}
                label={t("Cancel", "Откажи")}
                disabled={busy || !isWebSocketConnected}
                onPress={() => setConfirm("cancelled")}
              />
              <Button
                variant="secondary"
                icon={UserRoundX}
                style={{ flex: 1, paddingHorizontal: 10 }}
                label={t("No-show", "Не се појави")}
                disabled={busy || !isWebSocketConnected}
                onPress={() => setConfirm("no_show")}
              />
            </View>
          )}
          {confirm && (
            <Text accessibilityRole="alert">
              {confirm === "cancelled"
                ? t("Cancel this appointment?", "Да се откаже терминот?")
                : t(
                    "Mark this client as a no-show?",
                    "Да се означи дека клиентот не се појави?",
                  )}
            </Text>
          )}
        </Card>
      )}
      {error && <Text accessibilityRole="alert">{error}</Text>}
    </AppointmentModal>
  );
}
