import * as Location from 'expo-location';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, useColorScheme, View } from 'react-native';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

// ─── Types ────────────────────────────────────────────────────────────────────

export type LocationReady = {
  status: 'ready';
  city: string;
  coords: { lat: number; lng: number };
};

type LocationState =
  | { status: 'loading' }
  | { status: 'denied' }
  | LocationReady;

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<LocationState>({ status: 'loading' });

export function useLocation() {
  return useContext(Ctx);
}

// ─── Reverse geocode ─────────────────────────────────────────────────────────

async function reverseGeocodeCity(lat: number, lng: number): Promise<string> {
  if (MAPBOX_TOKEN) {
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&language=en&limit=1&access_token=${MAPBOX_TOKEN}`,
      );
      const data = await res.json() as { features?: Array<{ text?: string }> };
      const city = data.features?.[0]?.text;
      if (city) return city;
    } catch {}
  }
  // Fallback to on-device geocoder
  const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
  return result[0]?.city ?? result[0]?.subregion ?? result[0]?.region ?? 'Nearby';
}

// ─── Gate screens ─────────────────────────────────────────────────────────────

function LoadingScreen() {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#000' : '#fff';
  const fg = scheme === 'dark' ? '#fff' : '#000';
  return (
    <View style={{ flex: 1, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: fg, letterSpacing: -0.4 }}>OPUS</Text>
      <ActivityIndicator color="#E16349" />
    </View>
  );
}

function LocationBlockedScreen() {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? '#000' : '#fff';
  const fg = scheme === 'dark' ? '#fff' : '#111';
  const secondary = scheme === 'dark' ? '#8E8E93' : '#6B6B6B';
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
        gap: 12,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 22,
          backgroundColor: '#E1634918',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 40 }}>📍</Text>
      </View>
      <Text
        style={{ fontSize: 24, fontWeight: '700', color: fg, textAlign: 'center', letterSpacing: -0.4 }}
      >
        Location Required
      </Text>
      <Text style={{ fontSize: 15, color: secondary, textAlign: 'center', lineHeight: 22 }}>
        OPUS uses your location to show businesses near you and personalise recommendations.
      </Text>
      <Pressable
        onPress={() => void Linking.openSettings()}
        style={({ pressed }) => ({
          marginTop: 8,
          backgroundColor: '#E16349',
          paddingHorizontal: 32,
          paddingVertical: 15,
          borderRadius: 16,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Open Settings</Text>
      </Pressable>
    </View>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocationState>({ status: 'loading' });

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setState({ status: 'denied' });
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const city = await reverseGeocodeCity(pos.coords.latitude, pos.coords.longitude);
      setState({
        status: 'ready',
        city,
        coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      });
    })();
  }, []);

  if (state.status === 'loading') return <LoadingScreen />;
  if (state.status === 'denied') return <LocationBlockedScreen />;

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}
