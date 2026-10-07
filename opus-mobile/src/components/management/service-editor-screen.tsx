import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { Trash2 } from "lucide-react-native";
import type { MobileManagement } from "../../../../shared/mobile";
import { StudioModal } from "@/components/dashboard/studio-modal";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SelectionList } from "@/components/ui/selection-list";
import { ToggleRow } from "@/components/ui/toggle-row";
import { Loading } from "@/components/ui/loading";
import { backend, errorMessage } from "@/lib/backend";
import { priceInput, priceMinorUnits, roleLabel } from "@/lib/management";
import { useStudio } from "@/providers/studio-provider";

const fallback = {
  pathname: "/management",
  params: { section: "services" },
} as const;
export function ServiceEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useQuery(backend.management, {});
  const { t } = useStudio();
  const serviceId = id === "new" ? undefined : id;
  const title = serviceId
    ? t("Edit service", "Уреди услуга")
    : t("New service", "Нова услуга");
  if (!data)
    return (
      <StudioModal title={title} fallback={fallback} dismissToFallback>
        <Loading />
      </StudioModal>
    );
  if (!data.canManage)
    return (
      <StudioModal title={title} fallback={fallback} dismissToFallback>
        <Text>
          {t(
            "Only owners and managers can manage services.",
            "Само сопственици и менаџери можат да управуваат со услуги.",
          )}
        </Text>
      </StudioModal>
    );
  return (
    <ServiceEditor
      key={serviceId ?? "new"}
      data={data}
      serviceId={serviceId}
      title={title}
    />
  );
}
function ServiceEditor({
  data,
  serviceId,
  title,
}: {
  data: MobileManagement;
  serviceId?: string;
  title: string;
}) {
  const { t, language, colors } = useStudio();
  const { isWebSocketConnected } = useConvexConnectionState();
  const [initial] = useState(() =>
    serviceId ? data.services.find((s) => s.id === serviceId) : undefined,
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(
    String(
      initial?.durationMins ??
        Math.ceil(30 / data.slotDurationMins) * data.slotDurationMins,
    ),
  );
  const [price, setPrice] = useState(
    initial ? priceInput(initial.priceMinorUnits) : "",
  );
  const currency = initial?.currency ?? data.currency;
  const [staffIds, setStaffIds] = useState(
    initial?.staffIds ?? [data.callerId],
  );
  const [bookable, setBookable] = useState(
    initial ? initial.isActive && initial.isOpusVisible : true,
  );
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation(backend.saveService);
  const remove = useMutation(backend.removeService);
  const locked = busy || confirm;
  async function submit(removing = false) {
    if (busy || !isWebSocketConnected) return;
    const amount = priceMinorUnits(price);
    if (!removing && (amount === null || !/^\d+$/.test(duration))) {
      setError(
        t(
          "Enter a valid price and duration.",
          "Внеси валидна цена и времетраење.",
        ),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (removing && serviceId) await remove({ serviceId });
      else
        await save({
          ...(serviceId ? { serviceId } : {}),
          name,
          description,
          durationMins: Number(duration),
          priceMinorUnits: amount!,
          currency,
          staffIds,
          isActive: bookable,
          isOpusVisible: bookable,
        });
      router.dismissTo(fallback);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (serviceId && !initial)
    return (
      <StudioModal title={title} fallback={fallback} dismissToFallback>
        <Text>{t("Service unavailable.", "Услугата не е достапна.")}</Text>
      </StudioModal>
    );
  return (
    <StudioModal
      title={title}
      busy={busy}
      fallback={fallback}
      dismissToFallback
      footer={
        <>
          {error && (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {error}
            </Text>
          )}
          <Button
            label={
              busy
                ? t("Saving…", "Се зачувува…")
                : confirm
                  ? t("Confirm removal", "Потврди отстранување")
                  : serviceId
                    ? t("Save service", "Зачувај услуга")
                    : t("Add service", "Додај услуга")
            }
            variant={confirm ? "danger" : "primary"}
            disabled={
              busy || !isWebSocketConnected || (!confirm && !name.trim())
            }
            onPress={() => void submit(confirm)}
          />
          {confirm && (
            <Button
              variant="secondary"
              label={t("Keep service", "Задржи ја услугата")}
              disabled={busy}
              onPress={() => setConfirm(false)}
            />
          )}
        </>
      }
    >
      <Card style={{ borderRadius: 20 }}>
        <Input
          label={t("Service name", "Име на услугата")}
          value={name}
          onChangeText={setName}
          maxLength={120}
          editable={!locked}
        />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Input
              label={t("Duration (min)", "Траење (мин)")}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              maxLength={4}
              editable={!locked}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label={`${t("Price", "Цена")} (${currency})`}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              maxLength={12}
              editable={!locked}
            />
          </View>
        </View>
        <Text variant="caption" tone="muted">
          {t(
            `Duration uses ${data.slotDurationMins}-minute steps.`,
            `Траењето е во чекори од ${data.slotDurationMins} минути.`,
          )}
        </Text>
        <Input
          label={t("Description (optional)", "Опис (незадолжително)")}
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={2000}
          editable={!locked}
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />
      </Card>
      <Card style={{ borderRadius: 20 }}>
        <Text variant="heading">
          {t("Who offers this service?", "Кој ја нуди оваа услуга?")}
        </Text>
        <SelectionList
          options={data.team.map((s) => ({
            value: s.id,
            label: s.name,
            description: s.isActive
              ? roleLabel(s.role, language)
              : t("Inactive", "Неактивен"),
          }))}
          value={staffIds}
          onChange={setStaffIds}
          disabled={locked}
        />
        <Text variant="caption" tone="muted">
          {t(
            "Assign at least one active team member with working hours to make this service bookable.",
            "Додели барем еден активен член со работно време за услугата да може да се закажува.",
          )}
        </Text>
      </Card>
      <Card style={{ borderRadius: 20 }}>
        <ToggleRow
          label={t("Available for bookings", "Достапна за закажување")}
          description={t(
            "Offer this service in the calendar and on your booking website.",
            "Понуди ја услугата во календарот и на страницата за закажување.",
          )}
          value={bookable}
          onChange={setBookable}
          disabled={locked}
        />
      </Card>
      {serviceId && (
        <Card style={{ borderRadius: 20 }}>
          {confirm ? (
            <Text accessibilityRole="alert">
              {t(
                "Remove this service? Existing appointments keep their history. New bookings will no longer offer it.",
                "Да се отстрани услугата? Постоечките термини ја задржуваат историјата. Услугата нема да се нуди за нови закажувања.",
              )}
            </Text>
          ) : (
            <Button
              variant="danger"
              icon={Trash2}
              label={t("Remove service", "Отстрани услуга")}
              disabled={busy || !isWebSocketConnected}
              onPress={() => {
                setConfirm(true);
                setError(null);
              }}
            />
          )}
        </Card>
      )}
    </StudioModal>
  );
}
