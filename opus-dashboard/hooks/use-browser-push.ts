"use client";
import { useCallback, useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  browserPushDeviceId,
  browserPushSupported,
  connectBrowserPush,
  currentBrowserSubscription,
  serializableSubscription,
  unsubscribeBrowserPush,
} from "@/lib/browser-push";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import type { PushSettings } from "../../shared/push-notifications";

export function useBrowserPush(settings?: PushSettings) {
  const { language, t } = useDashboardI18n();
  const register = useMutation(api.pushNotifications.registerBrowser);
  const unregister = useMutation(api.pushNotifications.unregisterDevice);
  const [supported, setSupported] = useState(false);
  const [checked, setChecked] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const available = settings?.browserAvailable ?? false;
  const enabled = settings?.preferences.browserEnabled ?? false;
  const publicKey = settings?.browserPublicKey;
  const refresh = useCallback(async () => {
    if (!browserPushSupported()) return;
    setPermission(Notification.permission);
    const id = browserPushDeviceId(false);
    const subscription =
      Notification.permission === "granted"
        ? await currentBrowserSubscription()
        : null;
    setSubscribed(Boolean(subscription));
    setChecked(true);
    if (!subscription || !id) {
      if (id) await unregister({ deviceId: id });
      return;
    }
    setDeviceId(id);
    if (!available || !enabled) return;
    await register({
      deviceId: id,
      subscription: serializableSubscription(subscription),
      locale: language,
    });
    setError(null);
  }, [available, enabled, language, register, unregister]);
  useEffect(() => {
    setSupported(browserPushSupported());
    const check = () => {
      void refresh()
        .catch(() => {})
        .finally(() => setChecked(true));
    };
    check();
    const onFocus = () => {
      check();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);
  async function connect() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const subscription = await connectBrowserPush(publicKey);
      const id = browserPushDeviceId(true)!;
      await register({
        deviceId: id,
        subscription: serializableSubscription(subscription),
        locale: language,
      });
      setDeviceId(id);
      setSubscribed(true);
    } catch {
      setError(
        t(
          "Could not enable browser notifications. Check this site's notification permission and try again.",
          "Известувањата во прелистувачот не се вклучија. Провери ја дозволата за оваа страница и обиди се повторно.",
          "Njoftimet e shfletuesit nuk u aktivizuan. Kontrolloni lejen e kësaj faqeje dhe provoni përsëri.",
        ),
      );
    } finally {
      if (browserPushSupported()) setPermission(Notification.permission);
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    setError(null);
    try {
      const id = browserPushDeviceId(false);
      if (id) await unregister({ deviceId: id });
      await unsubscribeBrowserPush();
      setSubscribed(false);
    } catch {
      setError(
        t(
          "Could not disconnect notifications. Try again.",
          "Известувањата не се исклучија. Обиди се повторно.",
          "Njoftimet nuk u shkëputën. Provoni përsëri.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return {
    supported,
    checked,
    permission,
    deviceId,
    connected:
      subscribed &&
      (settings?.devices.some(
        (device) => device.kind === "web" && device.id === deviceId,
      ) ??
        false),
    busy,
    error,
    connect,
    disconnect,
  };
}
