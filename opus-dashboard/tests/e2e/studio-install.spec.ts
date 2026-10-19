import { expect, test, type Page } from "@playwright/test";

// Development previews deliberately accept localhost only (not production hosts).
const previewBaseURL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
test.use({ baseURL: previewBaseURL, channel: process.env.PLAYWRIGHT_CHANNEL });

const previewPath = "/dashboard-preview/install";
const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ipadDesktop =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";

type InstallTestWindow = Window & {
  installPromptCalls: number;
  notificationPermissionCalls: number;
  resolveInstallChoice: (choice: { outcome: "accepted" | "dismissed" }) => void;
};

async function openPreview(page: Page, locale: "en" | "mk" = "en") {
  await page.context().addCookies([
    {
      name: "opus_locale",
      value: locale,
      url: new URL(previewBaseURL).origin,
    },
  ]);
  await page.goto(previewPath);
  await expect(page.locator("#install-app")).toBeVisible();
  const rejectConsent = page.getByRole("button", {
    name: locale === "en" ? "Necessary only" : "Само неопходни",
    exact: true,
  });
  if (await rejectConsent.isVisible()) await rejectConsent.click();
}

async function dispatchInstallPrompt(page: Page, fail = false) {
  await page.evaluate((shouldFail) => {
    const testWindow = window as unknown as InstallTestWindow;
    testWindow.installPromptCalls = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    const choice = new Promise((resolve) => {
      testWindow.resolveInstallChoice = resolve;
    });
    Object.assign(event, {
      prompt: async () => {
        testWindow.installPromptCalls += 1;
        if (shouldFail) throw new Error("Test browser refused the prompt");
      },
      userChoice: choice,
    });
    window.dispatchEvent(event);
  }, fail);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    })),
  ).toEqual({ viewport: 320, document: 320, body: 320 });
  const dialog = await page.getByRole("dialog").boundingBox();
  expect(dialog).not.toBeNull();
  expect(dialog!.x).toBeGreaterThanOrEqual(0);
  expect(dialog!.x + dialog!.width).toBeLessThanOrEqual(320);
}

test.beforeEach(async ({ context, page, baseURL }) => {
  // This harness has no studio data. Keep every browser request local, including
  // any background integration that a shared root provider may initialize.
  const allowedOrigin = new URL(baseURL!).origin;
  await context.route("**/*", (route) => {
    const requestURL = new URL(route.request().url());
    return requestURL.origin === allowedOrigin
      ? route.continue()
      : route.abort();
  });
  await page.routeWebSocket(/.*/, (socket) => {
    const url = new URL(socket.url());
    if (url.host === new URL(allowedOrigin).host) socket.connectToServer();
    else socket.close();
  });
  await page.addInitScript(() => {
    const testWindow = window as unknown as InstallTestWindow;
    testWindow.notificationPermissionCalls = 0;
    if ("Notification" in window) {
      Notification.requestPermission = async () => {
        testWindow.notificationPermissionCalls += 1;
        return "denied";
      };
    }
  });
});

test("deferred installation needs a user press, is used once, and confirms only after appinstalled", async ({
  page,
}) => {
  await openPreview(page);
  await dispatchInstallPrompt(page);
  await expect(
    page.getByRole("button", { name: "Install web app" }),
  ).toHaveCount(2);
  expect(
    await page.evaluate(
      () => (window as unknown as InstallTestWindow).installPromptCalls,
    ),
  ).toBe(0);

  await page
    .locator("#install-app")
    .getByRole("button", { name: "Install web app" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Install OPUS Studio", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Waiting for your browser…" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as InstallTestWindow).installPromptCalls,
    ),
  ).toBe(1);

  await page.evaluate(() =>
    (window as unknown as InstallTestWindow).resolveInstallChoice({
      outcome: "accepted",
    }),
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.locator("#install-app").getByText("Installed", { exact: true }),
  ).not.toBeVisible();
  await expect(
    page
      .locator("#install-app")
      .getByRole("button", { name: "Install web app" }),
  ).toBeVisible();

  // The deferred event has been consumed; opening the entry again gives usable
  // manual instructions rather than invoking the same browser event twice.
  await page
    .locator("#install-app")
    .getByRole("button", { name: "Install web app" })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Look for the install icon", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as InstallTestWindow).installPromptCalls,
    ),
  ).toBe(1);
  await page.keyboard.press("Escape");

  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(
    page.locator("#install-app").getByText("Installed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Install web app" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Dismiss install suggestion" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as InstallTestWindow).notificationPermissionCalls,
    ),
  ).toBe(0);
});

test("a dismissed native prompt falls back to browser instructions", async ({
  page,
}) => {
  await openPreview(page);
  await dispatchInstallPrompt(page);
  await page
    .locator("#install-app")
    .getByRole("button", { name: "Install web app" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Install OPUS Studio", exact: true })
    .click();
  await page.evaluate(() =>
    (window as unknown as InstallTestWindow).resolveInstallChoice({
      outcome: "dismissed",
    }),
  );
  await expect(
    page
      .getByRole("dialog")
      .getByText("Look for the install icon", { exact: false }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Install OPUS Studio", exact: true }),
  ).toHaveCount(0);
});

test("a failed native prompt explains the failure and keeps manual instructions available", async ({
  page,
}) => {
  await openPreview(page);
  await dispatchInstallPrompt(page, true);
  await page
    .locator("#install-app")
    .getByRole("button", { name: "Install web app" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Install OPUS Studio", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    /The install prompt could not open/,
  );
  await expect(
    page
      .getByRole("dialog")
      .getByText("Look for the install icon", { exact: false }),
  ).toBeVisible();
  await expect(
    page.locator("#install-app").getByText("Installed", { exact: true }),
  ).not.toBeVisible();
});

test("standalone display mode shows installed status and no promotion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = matchMedia(query);
      if (query.includes("display-mode: standalone"))
        Object.defineProperty(result, "matches", { value: true });
      return result;
    };
  });
  await openPreview(page);
  await expect(
    page.locator("#install-app").getByText("Installed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("OPUS Studio is installed on this device."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Install web app" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Dismiss install suggestion" }),
  ).toHaveCount(0);
});

test("iOS standalone reports installed even without display-mode support", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "standalone", { value: true }),
  );
  await openPreview(page);
  await expect(
    page.locator("#install-app").getByText("Installed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Install web app" }),
  ).toHaveCount(0);
});

test("ordinary browser fullscreen does not report that the app is installed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = matchMedia(query);
      if (query.includes("display-mode: fullscreen"))
        Object.defineProperty(result, "matches", { value: true });
      return result;
    };
  });
  await openPreview(page);
  await expect(
    page.locator("#install-app").getByText("Installed", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .locator("#install-app")
      .getByRole("button", { name: "Install web app" }),
  ).toBeVisible();
});

test("dismissing the promotion persists while the preferences entry stays usable", async ({
  page,
}) => {
  await page.addInitScript(
    (userAgent) =>
      Object.defineProperty(navigator, "userAgent", { value: userAgent }),
    iphone,
  );
  await openPreview(page);
  await expect(
    page.getByRole("button", { name: "Install web app" }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Dismiss install suggestion" })
    .click();
  await expect(
    page.getByRole("button", { name: "Install web app" }),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.locator("#install-app")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Dismiss install suggestion" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Install web app" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Open this dashboard in Safari", { exact: false }),
  ).toBeVisible();
});

for (const device of [
  { name: "iPhone", userAgent: iphone, touchPoints: 5 },
  {
    name: "iPad with desktop user agent",
    userAgent: ipadDesktop,
    touchPoints: 5,
  },
]) {
  test(`${device.name} gets iOS home-screen instructions`, async ({ page }) => {
    await page.addInitScript(({ userAgent, touchPoints }) => {
      Object.defineProperty(navigator, "userAgent", { value: userAgent });
      Object.defineProperty(navigator, "maxTouchPoints", {
        value: touchPoints,
      });
    }, device);
    await openPreview(page);
    await page
      .locator("#install-app")
      .getByRole("button", { name: "Install web app" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("listitem")).toHaveCount(3);
    await expect(
      dialog.getByText("Open this dashboard in Safari", { exact: false }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Choose “Add to Home Screen”", { exact: false }),
    ).toBeVisible();
    await expect(
      dialog.getByText("Keep “Open as Web App” on", { exact: false }),
    ).toBeVisible();
  });
}

for (const locale of ["en", "mk"] as const) {
  test(`320px ${locale} install dialog fits and supports keyboard close and focus return`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.addInitScript(
      (userAgent) =>
        Object.defineProperty(navigator, "userAgent", { value: userAgent }),
      iphone,
    );
    await openPreview(page, locale);
    const installButton = page.locator("#install-app").getByRole("button", {
      name: locale === "en" ? "Install web app" : "Инсталирај веб-апликација",
    });
    await installButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("heading")).toHaveText(
      locale === "en"
        ? "Your studio, one tap away"
        : "Вашето студио, на еден допир",
    );
    await expect(page.getByRole("dialog").getByRole("listitem")).toHaveCount(3);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`install-${locale}-320px.png`),
      fullPage: true,
    });
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((dialog) => dialog.contains(document.activeElement)),
    ).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(installButton).toBeFocused();
  });
}

test("the real worker gives studio navigation an offline retry screen without caching private data", async ({
  page,
  context,
}, testInfo) => {
  await openPreview(page);
  const workerURL = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL;
  });
  expect(workerURL).toContain("/opus-push-sw.js");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as InstallTestWindow).notificationPermissionCalls,
    ),
  ).toBe(0);

  await context.setOffline(true);
  const response = await page.goto("/beauty");
  expect(response?.status()).toBe(503);
  await expect(
    page.getByRole("heading", { name: "Can't connect to OPUS" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Try again" })).toHaveAttribute(
    "href",
    "",
  );
  await expect(
    page.getByText("You need to be online to view appointments", {
      exact: false,
    }),
  ).toBeVisible();
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
  await page.screenshot({
    path: testInfo.outputPath("install-offline-320px.png"),
    fullPage: true,
  });

  // API and customer navigation never receive studio HTML as a fallback.
  expect(
    await page.evaluate(async () => {
      try {
        await fetch("/api/auth/get-session");
        return "resolved";
      } catch {
        return "network-error";
      }
    }),
  ).toBe("network-error");
  await expect(page.goto("/account/sign-in")).rejects.toThrow(/net::ERR_/);
  await expect(
    page.getByRole("heading", { name: "Can't connect to OPUS" }),
  ).toHaveCount(0);
  await expect(page.goto("/sites/test-studio")).rejects.toThrow(/net::ERR_/);
  await expect(
    page.getByRole("heading", { name: "Can't connect to OPUS" }),
  ).toHaveCount(0);
  await context.setOffline(false);
});
