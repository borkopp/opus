import { useState } from "react";
import { View, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChoicePicker } from "@/components/ui/choice-picker";
import { Loading } from "@/components/ui/loading";
import { DayPicker } from "./day-picker";
import { useStudio } from "@/providers/studio-provider";
import { useStudioData } from "@/providers/session-provider";
import { backend, errorMessage } from "@/lib/backend";
import {
  DAY,
  dateLabel,
  dayFromParam,
  moneyLabel,
  studioToday,
  timeLabel,
} from "@/lib/format";
import { useMinute } from "@/hooks/use-minute";
import { startAtFromParam } from "@/lib/calendar-timeline";
import { AppointmentModal } from "./appointment-modal";
export function NewAppointmentScreen() {
  const data = useStudioData();
  const { isWebSocketConnected } = useConvexConnectionState();
  const { t, colors, language } = useStudio();
  const {
    day: requestedDay,
    name: requestedName,
    email: requestedEmail,
    phone: requestedPhone,
    staff: requestedStaff,
    startAt: requestedStartAt,
  } = useLocalSearchParams<{
    day?: string;
    name?: string;
    email?: string;
    phone?: string;
    staff?: string;
    startAt?: string;
  }>();
  const today = studioToday(data.timezone);
  const [day, setDay] = useState(() =>
    Math.max(today, dayFromParam(requestedDay, today)),
  );
  const [serviceId, setServiceId] = useState(
    () =>
      data.services.find(
        (s) => requestedStaff && s.staffIds.includes(requestedStaff),
      )?.id ??
      data.services[0]?.id ??
      "",
  );
  const service = data.services.find((s) => s.id === serviceId);
  const eligible = data.team.filter((s) => service?.staffIds.includes(s.id));
  const [selectedStaff, setSelectedStaff] = useState(requestedStaff ?? "");
  const staffId = eligible.some((s) => s.id === selectedStaff)
    ? selectedStaff
    : eligible[0]?.id;
  const [startAt, setStartAt] = useState(() =>
    startAtFromParam(requestedStartAt, day),
  );
  const [name, setName] = useState(requestedName ?? "");
  const [email, setEmail] = useState(requestedEmail ?? "");
  const [phone, setPhone] = useState(requestedPhone ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshMinute = useMinute();
  const slots = useQuery(
    backend.slots,
    staffId && service
      ? {
          staffId,
          serviceId: service.id,
          date: new Date(day).toISOString().slice(0, 10),
          refreshMinute,
        }
      : "skip",
  );
  const slot = slots?.find((s) => s.startAt === startAt);
  const create = useMutation(backend.create);
  function changeDay(value: number) {
    setDay(value);
    setStartAt(null);
    setError(null);
  }
  async function save() {
    if (!staffId || !service || !slot || busy || !isWebSocketConnected) return;
    setBusy(true);
    setError(null);
    try {
      await create({
        staffId,
        serviceId: service.id,
        startAt: slot.startAt,
        customerName: name.trim(),
        ...(email.trim() ? { customerEmail: email.trim() } : {}),
        ...(phone.trim() ? { customerPhone: phone.trim() } : {}),
      });
      router.dismissTo({
        pathname: "/calendar",
        params: { day: String(day), week: String(day - 3 * DAY), staff: "all" },
      });
    } catch (e) {
      setError(errorMessage(e));
      setStartAt(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AppointmentModal
      title={t("New appointment", "Нов термин")}
      busy={busy}
      day={day}
      footer={
        <>
          {slot && service && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="label">{service.name}</Text>
                <Text variant="caption" tone="muted">
                  {timeLabel(slot.startAt)}–{timeLabel(slot.endAt)}
                </Text>
              </View>
              <Text variant="heading" style={{ fontSize: 20 }}>
                {moneyLabel(slot.priceMinorUnits, language, service.currency)}
              </Text>
            </View>
          )}
          <Button
            label={
              busy
                ? t("Saving…", "Се зачувува…")
                : t("Confirm appointment", "Потврди термин")
            }
            disabled={busy || !isWebSocketConnected || !slot || !name.trim()}
            onPress={() => void save()}
          />
        </>
      }
    >
      <Card style={{ borderRadius: 20 }}>
        <Text variant="heading">{t("Service", "Услуга")}</Text>
        {data.services.length ? (
          <ChoicePicker
            disabled={busy}
            options={data.services.map((s) => ({ value: s.id, label: s.name }))}
            value={serviceId}
            onChange={(value) => {
              setServiceId(value);
              setStartAt(null);
              setError(null);
            }}
          />
        ) : (
          <Text tone="muted">
            {t(
              "Add a service and working hours on the web dashboard first.",
              "Прво додај услуга и работно време на веб контролната табла.",
            )}
          </Text>
        )}
        {service && (
          <Text tone="muted">
            {service.durationMins} min ·{" "}
            {moneyLabel(service.priceMinorUnits, language, service.currency)}
          </Text>
        )}
        <Text variant="label">{t("Team member", "Член на тимот")}</Text>
        {eligible.length ? (
          <ChoicePicker
            disabled={busy}
            options={eligible.map((s) => ({ value: s.id, label: s.name }))}
            value={staffId ?? ""}
            onChange={(value) => {
              setSelectedStaff(value);
              setStartAt(null);
              setError(null);
            }}
          />
        ) : (
          <Text tone="muted">
            {t(
              "No active team member is assigned to this service.",
              "Нема активен член на тимот доделен на услугата.",
            )}
          </Text>
        )}
      </Card>
      <Card style={{ borderRadius: 20 }}>
        <Text variant="heading">{t("Date & time", "Датум и време")}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            variant="secondary"
            label={t("Earlier", "Претходно")}
            onPress={() => changeDay(Math.max(today, day - 7 * DAY))}
            disabled={busy || day <= today}
          />
          <Button
            variant="secondary"
            label={t("Next week", "Следна недела")}
            onPress={() => changeDay(day + 7 * DAY)}
            disabled={busy || !isWebSocketConnected}
          />
        </View>
        <DayPicker
          start={day}
          selected={day}
          onSelect={changeDay}
          disabled={busy}
        />
        <Text variant="label">{dateLabel(day, language)}</Text>
        {startAt !== null && slots !== undefined && !slot && (
          <Text tone="muted" accessibilityRole="alert">
            {t(
              "That time is unavailable for this service. Choose an available time below.",
              "Тоа време не е слободно за оваа услуга. Избери слободен термин подолу.",
            )}
          </Text>
        )}
        {staffId && service ? (
          slots === undefined ? (
            <Loading />
          ) : slots.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {slots.map((s) => (
                <Pressable
                  key={s.startAt}
                  disabled={busy || !isWebSocketConnected}
                  accessibilityRole="button"
                  accessibilityState={{ selected: startAt === s.startAt }}
                  aria-selected={startAt === s.startAt}
                  accessibilityLabel={timeLabel(s.startAt)}
                  onPress={() => setStartAt(s.startAt)}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    justifyContent: "center",
                    backgroundColor:
                      startAt === s.startAt ? colors.primary : colors.secondary,
                  }}
                >
                  <Text
                    style={{
                      color:
                        startAt === s.startAt
                          ? colors.primaryText
                          : colors.foreground,
                    }}
                  >
                    {timeLabel(s.startAt)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text tone="muted">
              {t(
                "No available times. Choose another day or team member.",
                "Нема слободни термини. Избери друг ден или член на тимот.",
              )}
            </Text>
          )
        ) : null}
      </Card>
      <Card style={{ borderRadius: 20 }}>
        <Text variant="heading">{t("Client", "Клиент")}</Text>
        <Input
          label={t("Name", "Име")}
          value={name}
          onChangeText={setName}
          maxLength={120}
          editable={!busy}
          autoComplete="name"
        />
        <Input
          label={t("Email (optional)", "Е-пошта (незадолжително)")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          maxLength={254}
          editable={!busy}
        />
        <Input
          label={t("Phone (optional)", "Телефон (незадолжително)")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          maxLength={40}
          editable={!busy}
        />
        <Text variant="caption" tone="muted">
          {t(
            "Existing clients are matched by email or phone. Add contact details to send confirmations when delivery is configured.",
            "Постоечките клиенти се поврзуваат преку е-пошта или телефон. Додај контакт за потврди кога испраќањето е конфигурирано.",
          )}
        </Text>
      </Card>
      {error && <Text accessibilityRole="alert">{error}</Text>}
    </AppointmentModal>
  );
}
