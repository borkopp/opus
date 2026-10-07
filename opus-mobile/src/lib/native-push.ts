import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";

const DEVICE_KEY = "opus.studio.push.device";
const OPT_IN_KEY = "opus.studio.push.optin";
export function nativePushSupported() {
  return (
    Platform.OS !== "web" &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    (Device.isDevice || Platform.OS === "android")
  );
}
export async function pushDeviceId(create = true): Promise<string | null> {
  if (Platform.OS === "web") return null;
  const stored = await SecureStore.getItemAsync(DEVICE_KEY);
  if (stored || !create) return stored;
  const id = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_KEY, id);
  return id;
}
export const devicePushOptedIn = async () =>
  Platform.OS !== "web" &&
  (await SecureStore.getItemAsync(OPT_IN_KEY)) === "true";
export async function rememberPushOptIn(enabled: boolean) {
  if (Platform.OS !== "web")
    await SecureStore.setItemAsync(OPT_IN_KEY, enabled ? "true" : "false");
}
export async function notificationsModule() {
  if (!nativePushSupported()) return null;
  return import("expo-notifications");
}
export function nativePushProjectId(): string | null {
  const id =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  return typeof id === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)
    ? id
    : null;
}
export async function getPushToken(requestPermission: boolean) {
  const notifications = await notificationsModule();
  if (!notifications) return null;
  const projectId = nativePushProjectId();
  if (!projectId) return null;
  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("opus-appointments", {
      name: "OPUS appointments",
      importance: notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
    await notifications.setNotificationChannelAsync(
      "opus-appointments-silent",
      {
        name: "OPUS silent appointments",
        importance: notifications.AndroidImportance.LOW,
        sound: null,
      },
    );
  }
  let permission = await notifications.getPermissionsAsync();
  if (!permission.granted && requestPermission && permission.canAskAgain)
    permission = await notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  if (!permission.granted) return null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      notifications.getExpoPushTokenAsync({ projectId }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Push setup timed out")),
          20000,
        );
      }),
    ]);
    return result.data;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
