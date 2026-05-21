import Constants from 'expo-constants';
import { Platform } from 'react-native';

const LOCALHOST = '127.0.0.1';
const ANDROID_EMULATOR_HOST = '10.0.2.2';

/**
 * Resolves Convex deployment URL for the current runtime.
 *
 * `.env.local` uses 127.0.0.1 for local `convex dev` on the Mac. That only works
 * in the iOS Simulator / web. Expo Go on a physical device must use the Mac's
 * LAN IP (same host Metro uses — see `exp://…` in the Expo CLI).
 */
export function getConvexUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

  if (!envUrl) {
    throw new Error(
      'Missing EXPO_PUBLIC_CONVEX_URL. Copy .env.example to .env.local and set your Convex deployment URL.',
    );
  }

  if (!__DEV__ || !envUrl.includes(LOCALHOST)) {
    return envUrl;
  }

  if (Platform.OS === 'android' && !Constants.isDevice) {
    return envUrl.replace(LOCALHOST, ANDROID_EMULATOR_HOST);
  }

  // Same LAN host Metro uses (e.g. exp://192.168.100.34:8081 → 192.168.100.34)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const lanHost = hostUri.split(':')[0];
    if (lanHost && lanHost !== LOCALHOST) {
      return envUrl.replace(LOCALHOST, lanHost);
    }
  }

  return envUrl;
}
