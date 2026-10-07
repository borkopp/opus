import { captureAppError, monitoringEnabled, navigationMonitoring } from "@/lib/monitoring";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigationContainerRef, type ErrorBoundaryProps } from "expo-router";
import * as Sentry from "@sentry/react-native";
import { useFonts } from "expo-font";
import { Audiowide_400Regular } from "@expo-google-fonts/audiowide";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from "@expo-google-fonts/manrope";
import { StudioProvider, useStudio } from "@/providers/studio-provider";

import { SessionProvider } from "@/providers/session-provider";
import { convexUrl } from "@/lib/auth-client";
import { RecoveryScreen } from "@/components/account/recovery-screen";
import { StartupScreen } from "@/components/account/startup-screen";
import { AppNavigation } from "@/components/navigation/app-navigation";
import { PushProvider } from "@/providers/push-provider";
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 200, fade: true });
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => captureAppError(error, "render"), [error]);
  return (
    <SafeAreaProvider>
      <StudioProvider>
        <RecoveryScreen retry={retry} />
      </StudioProvider>
    </SafeAreaProvider>
  );
}
export const unstable_settings = { anchor: "(tabs)" };

function StartupGate({ children }: { children: ReactNode }) {
  const { ready } = useStudio();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  return ready ? children : null;
}

function RootLayout() {
  const navigationRef = useNavigationContainerRef();
  useEffect(() => {
    if (monitoringEnabled) navigationMonitoring.registerNavigationContainer(navigationRef);
  }, [navigationRef]);
  const [fontTimeout, setFontTimeout] = useState(false);
  const [loaded, error] = useFonts({
    Audiowide_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
  });
  useEffect(() => {
    if (loaded || error) return;
    const timeout = setTimeout(() => setFontTimeout(true), 10000);
    return () => clearTimeout(timeout);
  }, [loaded, error]);
  if (!loaded && !error && !fontTimeout) return null;
  return (
    <SafeAreaProvider>
      <StudioProvider>
        <StartupGate>
          {convexUrl ? (
            <SessionProvider>
              <PushProvider>
                <AppNavigation />
              </PushProvider>
            </SessionProvider>
          ) : (
            <StartupScreen unavailable />
          )}
        </StartupGate>
      </StudioProvider>
    </SafeAreaProvider>
  );
}

export default monitoringEnabled ? Sentry.wrap(RootLayout) : RootLayout;
