import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, AppState, Linking } from "react-native";
import { router, useRootNavigationState } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import type { PushSettings } from "../../../shared/push-notifications";
import { backend } from "@/lib/backend";
import { captureAppError } from "@/lib/monitoring";
import { authClient, dashboardUrl } from "@/lib/auth-client";
import {
  devicePushOptedIn,
  getPushToken,
  nativePushSupported,
  nativePushProjectId,
  notificationsModule,
  pushDeviceId,
  rememberPushOptIn,
} from "@/lib/native-push";
import { useStudio } from "./studio-provider";
import { useSession } from "./session-provider";

type PushContext = {
  settings: PushSettings | undefined;
  deviceId: string | null;
  supported: boolean;
  configured: boolean;
  busy: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disconnect: () => Promise<void>;
};
const Context = createContext<PushContext | null>(null);
export function PushProvider({ children }: { children: ReactNode }) {
  const { authenticated, studio, loading } = useSession();
  const { data: session } = authClient.useSession();
  const sessionId = session?.session.id;
  const { language, t } = useStudio();
  const navigation = useRootNavigationState();
  const settings = useQuery(
    backend.pushSettings,
    authenticated && studio && !loading ? {} : "skip",
  );
  const register = useMutation(backend.registerPushDevice);
  const unregister = useMutation(backend.unregisterPushDevice);
  const openNotification = useMutation(backend.openPushNotification);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingNotification, setPendingNotification] = useState<string | null>(
    null,
  );
  const [openAttempt, setOpenAttempt] = useState(0);
  const handled = useRef<string | null>(null);
  const registrationBusy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const mobileAvailable = settings?.mobileAvailable ?? false;
  const mobileEnabled = settings?.preferences.mobileEnabled ?? false;
  const studioId = studio?.orgId;
  const supported = nativePushSupported();
  const configured = Boolean(nativePushProjectId());

  const sync = useCallback(
    async (explicit = false) => {
      if (
        !supported ||
        !sessionId ||
        !mobileAvailable ||
        !mobileEnabled ||
        !studioId ||
        registrationBusy.current
      )
        return;
      if (!explicit && !(await devicePushOptedIn())) return;
      registrationBusy.current = true;
      try {
        const token = await getPushToken(explicit);
        const id = await pushDeviceId(explicit);
        if (!token || !id) {
          if (id) await unregister({ deviceId: id });
          if (explicit) throw new Error("permission-unavailable");
          return;
        }
        await register({ deviceId: id, token, locale: language });
        await rememberPushOptIn(true);
        setDeviceId(id);
      } finally {
        registrationBusy.current = false;
      }
    },
    [
      supported,
      mobileAvailable,
      mobileEnabled,
      studioId,
      sessionId,
      language,
      register,
      unregister,
    ],
  );

  useEffect(() => {
    void pushDeviceId(false)
      .then(setDeviceId)
      .catch(() => {});
    void sync().catch(() => {});
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync().catch(() => {});
    });
    return () => listener.remove();
  }, [sync]);

  useEffect(() => {
    let active = true;
    const subscriptions: { remove: () => void }[] = [];
    void notificationsModule()
      .then(async (notifications) => {
        if (!notifications || !active) return;
        notifications.setNotificationHandler({
          handleNotification: async (notification) => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: notification.request.content.sound !== null,
            shouldSetBadge: false,
          }),
        });
        const capture = (
          response: import("expo-notifications").NotificationResponse | null,
        ) => {
          const id =
            response?.notification.request.content.data?.notificationId;
          if (active && typeof id === "string" && /^[a-z0-9]{20,64}$/.test(id))
            setPendingNotification(id);
        };
        subscriptions.push(
          notifications.addNotificationResponseReceivedListener(capture),
        );
        subscriptions.push(
          notifications.addPushTokenListener(() => {
            void sync().catch(() => {});
          }),
        );
        const response = await notifications.getLastNotificationResponseAsync();
        capture(response);
      })
      .catch(() => {});
    return () => {
      active = false;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [sync]);

  useEffect(() => {
    if (
      !pendingNotification ||
      !authenticated ||
      loading ||
      !navigation?.key ||
      handled.current === pendingNotification
    )
      return;
    handled.current = pendingNotification;
    void openNotification({ notificationId: pendingNotification })
      .then(async (target) => {
        if (!mounted.current) return;
        setPendingNotification(null);
        const notifications = await notificationsModule();
        await notifications?.clearLastNotificationResponseAsync();
        if (target?.kind === "appointment")
          router.push({
            pathname: "/appointment/[id]",
            params: { id: target.id },
          });
        else if (target?.kind === "ai_inbox")
          await Linking.openURL(
            `${dashboardUrl}/notifications/open?id=${encodeURIComponent(pendingNotification)}`,
          );
        else
          Alert.alert(
            t("Notification", "Известување"),
            t(
              "This notification is no longer available.",
              "Ова известување повеќе не е достапно.",
            ),
          );
      })
      .catch(() => {
        if (!mounted.current) return;
        handled.current = null;
        Alert.alert(
          t("Notification", "Известување"),
          t(
            "Could not open the notification. Check your connection.",
            "Известувањето не се отвори. Провери ја врската.",
          ),
          [
            {
              text: t("Cancel", "Откажи"),
              style: "cancel",
              onPress: () => setPendingNotification(null),
            },
            {
              text: t("Retry", "Обиди се повторно"),
              onPress: () => setOpenAttempt((value) => value + 1),
            },
          ],
        );
      });
  }, [
    pendingNotification,
    authenticated,
    loading,
    navigation?.key,
    openNotification,
    openAttempt,
    t,
  ]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      await sync(true);
    } catch (error) {
      if (!(error instanceof Error && error.message === "permission-unavailable"))
        captureAppError(error, "push-registration");
      setError(
        t(
          "Could not enable notifications. Check notification permission in your phone settings and try again.",
          "Известувањата не се вклучија. Провери ја дозволата во поставките на телефонот и обиди се повторно.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const id = await pushDeviceId(false);
      if (id) await unregister({ deviceId: id });
      await rememberPushOptIn(false);
      const notifications = await notificationsModule();
      await notifications?.dismissAllNotificationsAsync();
    } catch {
      setError(
        t(
          "Could not disconnect notifications. Try again.",
          "Известувањата не се исклучија. Обиди се повторно.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        settings,
        deviceId,
        supported,
        configured,
        busy,
        error,
        enable,
        disconnect,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePush() {
  const value = useContext(Context);
  if (!value) throw new Error("PushProvider is required.");
  return value;
}
