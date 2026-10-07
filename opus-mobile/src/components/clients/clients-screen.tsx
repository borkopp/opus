import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "convex/react";
import { Search } from "lucide-react-native";
import { Screen } from "@/components/dashboard/screen";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button, Segmented } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { backend } from "@/lib/backend";
import { dateLabel } from "@/lib/format";
import { useStudio } from "@/providers/studio-provider";
import { useStudioData } from "@/providers/session-provider";
import { ClientsProCard } from "./clients-pro-card";
export function ClientsScreen() {
  const { t, language } = useStudio();
  const data = useStudioData();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [segment, setSegment] = useState<"all" | "returning" | "unvisited">(
    "all",
  );
  const result = useQuery(
    backend.clients,
    data.plan === "paid" ? { search, page, segment, sort: "recent" } : "skip",
  );
  return (
    <Screen
      title={t("Clients", "Клиенти")}
      subtitle={t(
        "The people who keep coming back.",
        "Луѓето кои се враќаат во твоето студио.",
      )}
    >
      {data.plan !== "paid" ? (
        <ClientsProCard owner={data.profile.role === "owner"} />
      ) : (
        <>
          <Input
            placeholder={t("Search clients", "Пребарај клиенти")}
            icon={Search}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            value={search}
            onChangeText={(value) => {
              setSearch(value);
              setPage(0);
            }}
            maxLength={150}
          />
          <Segmented
            value={segment}
            onChange={(value) => {
              setSegment(value);
              setPage(0);
            }}
            options={[
              { value: "all", label: t("All", "Сите") },
              { value: "returning", label: t("Returning", "Повторни") },
              { value: "unvisited", label: t("New", "Нови") },
            ]}
          />
          {result === undefined ? (
            <Loading />
          ) : (
            <>
              <Text tone="muted">
                {result.total} {t("clients", "клиенти")}
              </Text>
              <Card>
                {result.clients.length ? (
                  result.clients.map((client) => (
                    <Pressable
                      key={client.id}
                      accessibilityRole="button"
                      accessibilityLabel={client.name}
                      onPress={() =>
                        router.push({
                          pathname: "/client/[id]",
                          params: { id: client.id },
                        })
                      }
                      style={({ pressed }) => ({
                        minHeight: 76,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        opacity: pressed ? 0.65 : 1,
                      })}
                    >
                      <Avatar name={client.name} tone="lilac" />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text variant="label">{client.name}</Text>
                        <Text variant="caption" tone="muted">
                          {client.visits}{" "}
                          {t("completed visits", "завршени посети")}
                          {client.lastVisitAt
                            ? ` · ${dateLabel(client.lastVisitAt, language)}`
                            : ""}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Text tone="muted">
                    {t(
                      "No clients match this search.",
                      "Нема клиенти за ова пребарување.",
                    )}
                  </Text>
                )}
              </Card>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <Button
                  variant="secondary"
                  label={t("Previous", "Претходно")}
                  onPress={() => setPage(Math.max(0, result.page - 1))}
                  disabled={result.page === 0}
                />
                <Button
                  variant="secondary"
                  label={t("Next", "Следно")}
                  onPress={() => setPage(result.page + 1)}
                  disabled={(result.page + 1) * result.pageSize >= result.total}
                />
              </View>
            </>
          )}
        </>
      )}
    </Screen>
  );
}
