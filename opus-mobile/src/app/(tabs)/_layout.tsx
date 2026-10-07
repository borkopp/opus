import type { ColorValue } from "react-native";
import { Tabs } from "expo-router";
import {
  CalendarDays,
  LayoutGrid,
  Scissors,
  Settings2,
  UsersRound,
  type LucideIcon,
} from "lucide-react-native";
import { AnimatedTabBar } from "@/components/navigation/animated-tab-bar";
import { useStudio } from "@/providers/studio-provider";
import { useStudioData } from "@/providers/session-provider";

export default function TabLayout() {
  const { t } = useStudio();
  const studio = useStudioData();
  const icon = (Icon: LucideIcon) =>
    function TabIcon({
      color,
      focused,
    }: {
      color: ColorValue;
      focused: boolean;
    }) {
      return <Icon size={21} color={color} strokeWidth={focused ? 2 : 1.7} />;
    };
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarPosition: "bottom",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("Dashboard", "Преглед"),
          tabBarIcon: icon(LayoutGrid),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("Calendar", "Календар"),
          tabBarIcon: icon(CalendarDays),
        }}
      />
      <Tabs.Protected guard={studio.profile.bookingAccess !== "own"}>
        <Tabs.Screen
          name="clients"
          options={{
            title: t("Clients", "Клиенти"),
            tabBarIcon: icon(UsersRound),
          }}
        />
        <Tabs.Screen
          name="management"
          options={{
            title: t("Management", "Управување"),
            tabBarLabel: t("Manage", "Управ."),
            tabBarAccessibilityLabel: t("Management", "Управување"),
            tabBarIcon: icon(Scissors),
          }}
        />
      </Tabs.Protected>
      <Tabs.Screen
        name="settings"
        options={{
          title: t("Settings", "Поставки"),
          tabBarIcon: icon(Settings2),
        }}
      />
    </Tabs>
  );
}
