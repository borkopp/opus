import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Screen } from "@/components/dashboard/screen";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Loading } from "@/components/ui/loading";
import { StatusBadge } from "@/components/bookings/status-badge";
import { backend } from "@/lib/backend";
import { dateLabel, moneyLabel, timeLabel } from "@/lib/format";
import { useStudio } from "@/providers/studio-provider";
import { useStudioData } from "@/providers/session-provider";
export function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useStudioData();
  const { t, language } = useStudio();
  const result = useQuery(
    backend.client,
    data.plan === "paid" && id ? { customerId: id } : "skip",
  );
  if (data.plan !== "paid")
    return (
      <Screen underHeader>
        <Text>
          {t("Client history requires Pro.", "Историјата на клиенти бара Pro.")}
        </Text>
      </Screen>
    );
  if (result === undefined)
    return (
      <Screen underHeader>
        <Loading />
      </Screen>
    );
  if (!result)
    return (
      <Screen underHeader>
        <Text>{t("Client unavailable.", "Клиентот не е достапен.")}</Text>
      </Screen>
    );
  const { client } = result;
  return (
    <Screen underHeader>
      <Card>
        <Avatar name={client.name} tone="lilac" size={60} />
        <Text variant="title">{client.name}</Text>
        {client.email && <Text tone="muted">{client.email}</Text>}
        {client.phone && <Text tone="muted">{client.phone}</Text>}
        <Button
          label={t("Book appointment", "Закажи термин")}
          onPress={() =>
            router.push({
              pathname: "/appointment/new",
              params: {
                name: client.name,
                email: client.email ?? "",
                phone: client.phone ?? "",
              },
            })
          }
        />
      </Card>
      <Card>
        <Text variant="heading">
          {client.visits} {t("completed visits", "завршени посети")}
        </Text>
        {client.completedValue.map((value) => (
          <Text key={value.currency}>
            {moneyLabel(value.amountMinorUnits, language, value.currency)}
          </Text>
        ))}
        {result.favouriteService && (
          <Text tone="muted">
            {t("Favourite service", "Омилена услуга")}:{" "}
            {result.favouriteService}
          </Text>
        )}
        <Text tone="muted">
          {result.cancelled} {t("cancellations", "откажувања")} ·{" "}
          {result.noShows} {t("no-shows", "непојавувања")}
        </Text>
      </Card>
      {[
        { title: t("Upcoming", "Претстојни"), rows: result.upcoming },
        { title: t("History", "Историја"), rows: result.history },
      ].map((section) => (
        <Card key={section.title}>
          <Text variant="heading">{section.title}</Text>
          {section.rows.length ? (
            section.rows.map((a) => (
              <Card key={a.id}>
                <Text variant="label">{a.services.join(" + ")}</Text>
                <Text tone="muted">
                  {dateLabel(a.startAt, language)} · {timeLabel(a.startAt)} ·{" "}
                  {a.staffName}
                </Text>
                <Text>
                  {moneyLabel(a.priceMinorUnits, language, a.currency)}
                </Text>
                <StatusBadge status={a.status} />
                <Button
                  variant="secondary"
                  label={t("View appointment", "Прегледај термин")}
                  onPress={() =>
                    router.push({
                      pathname: "/appointment/[id]",
                      params: { id: a.id },
                    })
                  }
                />
              </Card>
            ))
          ) : (
            <Text tone="muted">{t("No appointments.", "Нема термини.")}</Text>
          )}
        </Card>
      ))}
    </Screen>
  );
}
