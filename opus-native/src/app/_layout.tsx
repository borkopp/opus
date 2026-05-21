import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ConvexClientProvider } from '@/components/convex-client-provider';
import { LocationProvider } from '@/context/location-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ConvexClientProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <LocationProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="business/[slug]" />
            <Stack.Screen name="book/[slug]" />
            <Stack.Screen
              name="menu/[slug]"
              options={{
                presentation: 'formSheet',
                sheetGrabberVisible: true,
                sheetAllowedDetents: [0.75, 1.0],
                headerShown: false,
              }}
            />
          </Stack>
        </LocationProvider>
      </ThemeProvider>
    </ConvexClientProvider>
  );
}
