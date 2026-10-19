/*
 * Studio install + push worker. Never cache requests or responses: dashboard
 * HTML, auth, APIs and appointment data must always come from the network.
 * The only offline content is the static, self-contained screen below.
 */
self.addEventListener("install", (event) =>
  event.waitUntil(self.skipWaiting()),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

const studioPaths = [
  "/beauty",
  "/settings",
  "/website",
  "/notifications",
  "/onboarding",
  "/upgrade",
  "/ai-inbox",
  "/gap-optimizer",
  "/login",
  "/signup",
];

function offlineScreen() {
  const language = self.navigator.language?.split("-")[0];
  const copy = {
    en: {
      title: "Can't connect to OPUS",
      message:
        "Check your internet connection and try again. You need to be online to view appointments or make changes.",
      retry: "Try again",
    },
    mk: {
      title: "Нема врска со OPUS",
      message:
        "Провери ја интернет-врската и обиди се повторно. Потребен е интернет за преглед на термините или правење промени.",
      retry: "Обиди се повторно",
    },
    sq: {
      title: "Nuk mund të lidhemi me OPUS",
      message:
        "Kontrolloni lidhjen me internetin dhe provoni përsëri. Ju duhet internet për të parë takimet ose për të bërë ndryshime.",
      retry: "Provoni përsëri",
    },
  };
  const locale = language === "mk" || language === "sq" ? language : "en";
  const { title, message, retry } = copy[locale];
  return new Response(
    `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#f7fafc">
  <title>${title} · OPUS Studio</title>
  <style>
    * { box-sizing: border-box; }
    html { color-scheme: light; }
    body { margin: 0; background: #f7fafc; color: #142c3c; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { min-height: 100vh; min-height: 100dvh; display: grid; place-content: center; justify-items: center; padding: max(32px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(32px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left)); text-align: center; }
    svg { width: 64px; height: 64px; margin-bottom: 18px; }
    .brand { margin: 0 0 28px; font-size: 13px; font-weight: 650; letter-spacing: .08em; }
    h1 { max-width: 420px; margin: 0 0 12px; font-size: clamp(24px, 6vw, 30px); line-height: 1.2; letter-spacing: -.03em; }
    p { max-width: 350px; margin: 0; color: #536779; font-size: 16px; line-height: 1.6; }
    a { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; margin-top: 28px; padding: 12px 24px; border-radius: 14px; background: #176fa8; color: #fff; font-weight: 600; text-decoration: none; }
    a:focus-visible { outline: 3px solid #142c3c; outline-offset: 4px; }
  </style>
</head>
<body>
  <main>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden="true"><g transform="translate(4)" fill="#2588c8"><path d="m40 32v-16c0-6.62742-5.3726-12-12-12h-16l-12 12h22c3.3137 0 6 2.6863 6 6v22z" opacity=".3"/><path d="m.0000014 16-.0000014 16c-.00000058 6.6274 5.37258 12 12 12h16l12-12h-20c-4.4183 0-8-3.5817-8-8v-20z"/></g></svg>
    <p class="brand">OPUS STUDIO</p>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="">${retry}</a>
  </main>
</body>
</html>`,
    {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;
  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin ||
    (url.pathname !== "/" &&
      !studioPaths.some(
        (path) => url.pathname === path || url.pathname.startsWith(`${path}/`),
      ))
  )
    return;

  // HTTP errors, redirects and auth responses pass through untouched. Only a
  // failed network request gets the offline screen; public booking is excluded.
  event.respondWith(
    fetch(request, { cache: "no-store" }).catch(() => offlineScreen()),
  );
});

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
