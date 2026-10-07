import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
export const dashboardUrl = (
  (Platform.OS !== "web"
    ? process.env.EXPO_PUBLIC_NATIVE_DASHBOARD_URL
    : undefined) ||
  process.env.EXPO_PUBLIC_DASHBOARD_URL ||
  "https://studio.opus.mk"
).replace(/\/$/, "");
export const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
export const authClient = createAuthClient({
  // OTP must pass through the signed dashboard proxy, never directly to Convex.
  baseURL: dashboardUrl,
  plugins: [
    emailOTPClient(),
    expoClient({
      scheme: "opus-studio",
      storagePrefix: "opus-studio",
      storage: SecureStore,
    }),
    convexClient(),
  ],
});
