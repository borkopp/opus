const DEVICE_KEY = "opus-studio-browser-push-device";
export function browserPushSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
export function browserPushDeviceId(create = false) {
  if (typeof window === "undefined") return null;
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing;
  if (!create) return null;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}
export async function currentBrowserSubscription() {
  if (!browserPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration("/");
  return registration?.pushManager.getSubscription() ?? null;
}
export async function connectBrowserPush(publicKey: string) {
  if (!browserPushSupported()) throw new Error("unsupported");
  // Must run directly from the user's button press, never during page load.
  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("permission");
  await navigator.serviceWorker.register("/opus-push-sw.js", { scope: "/" });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("service-worker")), 10000);
      }),
    ]);
    const key = Uint8Array.from(
      atob(publicKey.replace(/-/g, "+").replace(/_/g, "/")),
      (character) => character.charCodeAt(0),
    );
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      const previous = existing.options.applicationServerKey;
      if (
        previous &&
        key.every((byte, index) => new Uint8Array(previous)[index] === byte) &&
        previous.byteLength === key.byteLength
      )
        return existing;
      if (!(await existing.unsubscribe())) throw new Error("unsubscribe");
    }
    return registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export function serializableSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error("subscription");
  return {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  };
}
export async function unsubscribeBrowserPush() {
  const subscription = await currentBrowserSubscription();
  if (subscription && !(await subscription.unsubscribe()))
    throw new Error("unsubscribe");
  const registration = await navigator.serviceWorker?.getRegistration("/");
  const notifications = await registration?.getNotifications();
  notifications?.forEach((notification) => notification.close());
}
