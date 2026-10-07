import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { ChevronRight, Plus, Scissors, UsersRound } from "lucide-react-native";
import { Screen } from "@/components/dashboard/screen";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { IconButton, Segmented } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { backend } from "@/lib/backend";
import { moneyLabel } from "@/lib/format";
import { roleLabel } from "@/lib/management";
import { useStudio } from "@/providers/studio-provider";

export function ManagementScreen() {
  const data = useQuery(backend.management, {});
  const { section: requestedSection } = useLocalSearchParams<{
    section?: string;
  }>();
  const section = requestedSection === "team" ? "team" : "services";
  const { t, language, colors } = useStudio();
  return (
    <Screen
      title={t("Management", "Управување")}
      subtitle={t(
        "The people and services behind your studio.",
        "Тимот и услугите на твоето студио.",
      )}
      action={
        data?.canManage ? (
          <IconButton
            icon={Plus}
            filled
            label={
              section === "services"
                ? t("Add service", "Додај услуга")
                : t("Add team member", "Додај член на тимот")
            }
            onPress={() =>
              router.push({
                pathname:
                  section === "services" ? "/service/[id]" : "/team/[id]",
                params: { id: "new" },
              })
            }
          />
        ) : undefined
      }
    >
      <Segmented
        value={section}
        onChange={(section) => router.setParams({ section })}
        options={[
          { value: "services", label: t("Services", "Услуги") },
          { value: "team", label: t("Team", "Тим") },
        ]}
      />
      {!data ? (
        <Loading />
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text variant="label" style={{ flex: 1 }}>
              {section === "services"
                ? `${data.services.length} ${data.services.length === 1 ? t("service", "услуга") : t("services", "услуги")}`
                : `${data.capacity.totalCount}/${data.capacity.totalLimit} ${t("active members", "активни членови")}`}
            </Text>
            <Text variant="caption" tone="muted">
              {data.capacity.isFree
                ? t("Free plan", "Бесплатен план")
                : "OPUS Pro"}
            </Text>
          </View>
          {section === "services" ? (
            data.services.length ? (
              data.services.map((service) => (
                <Pressable
                  key={service.id}
                  accessibilityRole={data.canManage ? "button" : undefined}
                  accessibilityLabel={
                    data.canManage
                      ? `${t("Edit service", "Уреди услуга")}: ${service.name}`
                      : undefined
                  }
                  disabled={!data.canManage}
                  onPress={() =>
                    router.push({
                      pathname: "/service/[id]",
                      params: { id: service.id },
                    })
                  }
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <Card style={{ gap: 12, borderRadius: 22 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: colors.accent,
                          padding: 12,
                          borderRadius: 16,
                        }}
                      >
                        <Scissors color={colors.primary} size={22} />
                      </View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text variant="heading">{service.name}</Text>
                        <Text tone="muted">
                          {service.durationMins} min ·{" "}
                          {moneyLabel(
                            service.priceMinorUnits,
                            language,
                            service.currency,
                          )}
                        </Text>
                      </View>
                      {data.canManage && (
                        <ChevronRight size={20} color={colors.muted} />
                      )}
                    </View>
                    <Text variant="caption" tone="muted">
                      {data.team
                        .filter((s) => service.staffIds.includes(s.id))
                        .map((s) => s.name)
                        .join(" · ") ||
                        t(
                          "No team member assigned",
                          "Нема доделен член на тимот",
                        )}
                    </Text>
                    {(!service.isActive || !service.isOpusVisible) && (
                      <Text variant="caption" style={{ color: colors.primary }}>
                        {!service.isActive
                          ? t("Paused", "Паузирана")
                          : t(
                              "Hidden from booking website",
                              "Скриена од веб-страницата",
                            )}
                      </Text>
                    )}
                  </Card>
                </Pressable>
              ))
            ) : (
              <EmptyState
                icon={Scissors}
                title={t("Your first service", "Твојата прва услуга")}
                description={
                  data.canManage
                    ? t(
                        "Tap + to add a service, set its price and choose who offers it.",
                        "Притисни + за да додадеш услуга, цена и членови што ја нудат.",
                      )
                    : t(
                        "No services added yet.",
                        "Сè уште нема додадени услуги.",
                      )
                }
              />
            )
          ) : data.team.length ? (
            data.team.map((member) => (
              <Pressable
                key={member.id}
                accessibilityRole={member.canEdit ? "button" : undefined}
                accessibilityLabel={
                  member.canEdit
                    ? `${t("Edit team member", "Уреди член на тимот")}: ${member.name}`
                    : undefined
                }
                disabled={!member.canEdit}
                onPress={() =>
                  router.push({
                    pathname: "/team/[id]",
                    params: { id: member.id },
                  })
                }
                style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
              >
                <Card style={{ gap: 12, borderRadius: 22 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Avatar name={member.name} tone="sage" size={48} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="heading">{member.name}</Text>
                      <Text tone="muted">
                        {roleLabel(member.role, language)}
                        {!member.isActive
                          ? ` · ${t("Inactive", "Неактивен")}`
                          : ""}
                      </Text>
                    </View>
                    {member.canEdit && (
                      <ChevronRight size={20} color={colors.muted} />
                    )}
                  </View>
                  <Text variant="caption" tone="muted">
                    {data.services
                      .filter((s) => s.staffIds.includes(member.id))
                      .map((s) => s.name)
                      .join(" · ") ||
                      t("No services assigned", "Нема доделени услуги")}
                  </Text>
                  {data.canManage && (
                    <Text
                      variant="caption"
                      style={{
                        color: member.hasAccess ? colors.success : colors.muted,
                      }}
                    >
                      {member.hasAccess
                        ? t(
                            "Dashboard access linked",
                            "Поврзан пристап до таблата",
                          )
                        : member.pendingInviteEmail
                          ? t("Invitation pending", "Покана во очекување")
                          : t(
                              "Booking profile · no dashboard access",
                              "Профил за закажување · без пристап до таблата",
                            )}
                    </Text>
                  )}
                </Card>
              </Pressable>
            ))
          ) : (
            <EmptyState
              icon={UsersRound}
              title={t("Build your team", "Изгради го твојот тим")}
              description={
                data.canManage
                  ? t(
                      "Tap + to add a team member and set their working hours.",
                      "Притисни + за да додадеш член и негово работно време.",
                    )
                  : t(
                      "No team members added yet.",
                      "Сè уште нема додадени членови.",
                    )
              }
            />
          )}
          {!data.canManage && (
            <Text variant="caption" tone="muted">
              {t(
                "Owners and managers can edit services and team details.",
                "Сопственици и менаџери можат да уредуваат услуги и членови на тимот.",
              )}
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}
