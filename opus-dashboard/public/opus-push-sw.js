/* Push-only worker: no fetch handler or cache of authenticated studio data. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  let payload;
  try {
    payload = event.data?.json();
  } catch {
    return;
  }
  if (
    !payload ||
    typeof payload.notificationId !== "string" ||
    !/^[a-z0-9]{20,64}$/.test(payload.notificationId)
  )
    return;
  event.waitUntil(
    self.registration.showNotification(
      typeof payload.title === "string"
        ? payload.title.slice(0, 120)
        : "OPUS Studio",
      {
        body:
          typeof payload.body === "string" ? payload.body.slice(0, 450) : "",
        icon: "/studio-icon-192.png",
        badge: "/push-badge.png",
        tag: `opus-${payload.notificationId}`,
        silent: payload.silent === true,
        data: { notificationId: payload.notificationId },
      },
    ),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const id = event.notification.data?.notificationId;
  if (typeof id !== "string" || !/^[a-z0-9]{20,64}$/.test(id)) return;
  // Resolve permissions and the destination on the server after sign-in.
  const url = new URL(
    `/notifications/open?id=${encodeURIComponent(id)}`,
    self.location.origin,
  ).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        const client = clients.find(
          (client) => new URL(client.url).origin === self.location.origin,
        );
        if (client) {
          await client.navigate(url);
          return client.focus();
        }
        return self.clients.openWindow(url);
      }),
  );
});
