import { useEffect } from "react";
import { Platform } from "react-native";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useStudio } from "@/providers/studio-provider";
import { useSession } from "@/providers/session-provider";
import { ConnectionNotice } from "@/components/dashboard/connection-notice";
import { RecoveryScreen } from "@/components/account/recovery-screen";
import { StartupScreen } from "@/components/account/startup-screen";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { BackButton } from "./back-button";

export function AppNavigation() {
  const { colors, t, mediumFont, ready, setTheme } = useStudio();
  const { authenticated, loading, studio, error, retry } = useSession();
  const reducedMotion = useReducedMotion();
  const studioModalOptions = {
    presentation:
      Platform.OS === "web"
        ? ("transparentModal" as const)
        : ("formSheet" as const),
    headerShown: false,
    animation:
      Platform.OS === "web" || reducedMotion
        ? ("none" as const)
        : ("slide_from_bottom" as const),
    animationDuration: 280,
    sheetAllowedDetents: [1],
    sheetCornerRadius: 28,
    sheetGrabberVisible: false,
    contentStyle: {
      backgroundColor:
        Platform.OS === "web" ? "transparent" : colors.background,
    },
  };
  useEffect(() => {
    if (ready && studio) setTheme(studio.profile.theme);
  }, [ready, studio?.profile.theme, setTheme, studio]);
  if (loading) return <StartupScreen retry={retry} />;
  if (error) return <RecoveryScreen retry={retry} />;
  return (
    <ThemeProvider
      value={{
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.foreground,
          border: colors.border,
        },
      }}
    >
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: {
            color: colors.foreground,
            fontFamily: mediumFont,
          },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerBackTitle: t("Back", "Назад"),
          headerTitleAlign: "center",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen
            name="sign-in"
            options={{ headerShown: false, title: t("Sign in", "Најава") }}
          />
        </Stack.Protected>
        <Stack.Protected guard={authenticated && !studio}>
          <Stack.Screen
            name="no-studio"
            options={{
              headerShown: false,
              title: t("Studio access", "Пристап до студио"),
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={authenticated && !!studio}>
          <Stack.Screen
            name="(tabs)"
            options={{ headerShown: false, title: t("Studio", "Студио") }}
          />
          <Stack.Screen
            name="notifications/preferences"
            options={{
              title: t("Notifications", "Известувања"),
              headerBackVisible: false,
              headerLeft: () => <BackButton />,
            }}
          />
          <Stack.Screen
            name="appointment/new"
            options={{
              ...studioModalOptions,
              title: t("New appointment", "Нов термин"),
            }}
          />
          <Stack.Screen
            name="appointment/[id]"
            options={{
              ...studioModalOptions,
              title: t("Appointment", "Термин"),
            }}
          />
          <Stack.Protected guard={studio?.profile.bookingAccess !== "own"}>
            <Stack.Screen
              name="client/[id]"
              options={{
                title: t("Client", "Клиент"),
                presentation: "card",
                headerBackVisible: false,
                headerLeft: () => <BackButton />,
              }}
            />
            <Stack.Screen
              name="service/[id]"
              options={{ ...studioModalOptions, title: t("Service", "Услуга") }}
            />
            <Stack.Screen
              name="team/[id]"
              options={{
                ...studioModalOptions,
                title: t("Team member", "Член на тимот"),
              }}
            />
          </Stack.Protected>
        </Stack.Protected>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen
            name="account/delete"
            options={{
              title: t("Delete account", "Избриши сметка"),
              headerBackVisible: false,
              headerLeft: () => <BackButton />,
            }}
          />
        </Stack.Protected>
        <Stack.Screen
          name="+not-found"
          options={{
            title: t("Page unavailable", "Страницата не е достапна"),
            headerBackVisible: false,
            headerLeft: () => <BackButton />,
          }}
        />
      </Stack>
      <ConnectionNotice />
    </ThemeProvider>
  );
}
