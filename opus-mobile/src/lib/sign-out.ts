import { ConvexHttpClient } from "convex/browser";
import { authClient, convexUrl } from "./auth-client";
import { backend } from "./backend";
import {
  devicePushOptedIn,
  notificationsModule,
  pushDeviceId,
  rememberPushOptIn,
} from "./native-push";

/** Also works on recovery screens outside the React Convex provider. */
export async function signOutWithPushCleanup() {
  const deviceId = await pushDeviceId(false);
  if (deviceId && (await devicePushOptedIn())) {
    const session = await authClient.getSession({
      query: { disableCookieCache: true },
      fetchOptions: { timeout: 15000 },
    });
    if (session.error)
      throw new Error("Could not check notification access. Try again.");
    // Delivery rejects ended sessions; recovery must still allow local sign-out.
    if (session.data) {
      const token = await authClient.convex.token({
        fetchOptions: { timeout: 15000 },
      });
      if (token.error || !token.data?.token || !convexUrl)
        throw new Error("Could not revoke device notifications.");
      const client = new ConvexHttpClient(convexUrl);
      client.setAuth(token.data.token);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          client.mutation(backend.unregisterPushDevice, { deviceId }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("Device cleanup timed out")),
              15000,
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }
  await rememberPushOptIn(false);
  const notifications = await notificationsModule();
  if (notifications) {
    await notifications.dismissAllNotificationsAsync();
    await notifications.clearLastNotificationResponseAsync();
  }
  return authClient.signOut({ fetchOptions: { timeout: 15000 } });
}
