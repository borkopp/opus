import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import ts from "typescript";

// Render the real mobile screens and their hooks. The browser supplies DOM
// primitives in place of native views and an in-memory Convex transport. This
// tests user interactions and submitted payloads, not native rendering or APNs.
const mobileRoot = resolve("../opus-mobile/src");
const modules: Record<string, string> = {};
for (const [name, file] of Object.entries({
  react: "react/cjs/react.development.js",
  "react/jsx-runtime": "react/cjs/react-jsx-runtime.development.js",
  "react-dom": "react-dom/cjs/react-dom.development.js",
  "react-dom/client": "react-dom/cjs/react-dom-client.development.js",
  scheduler: "scheduler/cjs/scheduler.development.js",
}))
  modules[name] = readFileSync(resolve("node_modules", file), "utf8");

const mocks: Record<string, string> = {
  "react-native": `
    const React = require("react");
    const view = tag => ({ children, onPress, accessibilityRole,
      accessibilityLabel, accessibilityState, disabled, ...props }) =>
      React.createElement(tag, { onClick: onPress, disabled,
        role: accessibilityRole, "aria-label": accessibilityLabel,
        "aria-checked": accessibilityState?.checked,
        "aria-selected": accessibilityState?.selected }, children);
    exports.View = view("div"); exports.ScrollView = view("div");
    exports.Pressable = view("button"); exports.Text = view("span");
    exports.StyleSheet = { create: value => value };
    exports.Platform = { get OS() { return window.mobileFixture.platform; } };
    exports.Linking = { openURL: async url => window.mobileFixture.links.push(url) };
  `,
  "expo-router": `
    exports.useLocalSearchParams = () => window.mobileFixture.params;
    exports.router = { dismissTo: path => window.mobileFixture.navigation.push(path) };
  `,
  "convex/react": `
    exports.useConvexConnectionState = () => ({ isWebSocketConnected: true });
    exports.useQuery = (query, args) => {
      if (args === "skip") return undefined;
      window.mobileFixture.queries.push({query, args});
      return window.mobileFixture.results[query];
    };
    exports.useMutation = mutation => async args => {
      window.mobileFixture.calls.push({mutation, args});
      return "booking-one";
    };
  `,
  "@/lib/backend": `
    exports.backend = new Proxy({}, {get: (_, key) => key});
    exports.errorMessage = error => error.message;
  `,
  "@/lib/auth-client": `exports.dashboardUrl = "https://studio.opus.mk";`,
  "@/providers/studio-provider": `
    exports.useStudio = () => ({ language: window.mobileFixture.language,
      colors: require("@/lib/theme").palettes.clarity,
      localize: value => value[window.mobileFixture.language],
      t: (en, mk) => window.mobileFixture.language === "mk" ? mk : en });
  `,
  "@/providers/session-provider": `
    exports.useStudioData = () => window.mobileFixture.studio;
  `,
  "@/hooks/use-minute": `exports.useMinute = () => 0;`,
  "lucide-react-native": `
    module.exports = new Proxy({}, { get: () => () => null });
  `,
  "@/components/ui/button": `
    const React = require("react");
    exports.Button = ({label, onPress, disabled}) =>
      React.createElement("button", {onClick:onPress, disabled}, label);
  `,
  "@/components/ui/input": `
    const React = require("react");
    exports.Input = ({label, value, onChangeText, editable}) =>
      React.createElement("label", {}, label, React.createElement("input", {
        value, disabled: editable === false,
        onChange: event => onChangeText(event.target.value) }));
  `,
  "@/components/ui/text": `
    const React = require("react");
    exports.Text = ({children, accessibilityRole}) =>
      React.createElement(accessibilityRole === "header" ? "h2" : "span",
        {role: accessibilityRole === "alert" ? "alert" : undefined}, children);
  `,
  "@/components/ui/card": `
    const React = require("react");
    exports.Card = ({children}) => React.createElement("section", {}, children);
  `,
  "@/components/ui/avatar": `exports.Avatar = () => null;`,
  "@/components/ui/loading": `exports.Loading = () => "Loading";`,
};
const modalMock = `
  const React = require("react");
  exports.AppointmentModal = exports.StudioModal = ({title, children, footer}) =>
    React.createElement("article", {}, React.createElement("h1", {}, title),
      children, React.createElement("footer", {}, footer));
`;
mocks["@/components/bookings/appointment-modal"] = modalMock;
mocks["@/components/dashboard/studio-modal"] = modalMock;
mocks["@/components/bookings/day-picker"] = `exports.DayPicker = () => null;`;

function collect(name: string) {
  if (modules[name]) return;
  if (mocks[name]) {
    modules[name] = mocks[name];
    // This mock deliberately uses the real palette.
    if (name === "@/providers/studio-provider") collect("@/lib/theme");
    return;
  }
  const base = resolve(mobileRoot, name.replace(/^@\//, ""));
  const file = [base + ".tsx", base + ".ts"].find(existsSync);
  if (!file) throw new Error(`Unmapped mobile test dependency: ${name}`);
  let source = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const dependencies: string[] = [];
  source = source.replace(/require\("([^"]+)"\)/g, (_, request: string) => {
    const resolved = request.startsWith(".")
      ? resolve(dirname(file), request)
      : request;
    const dependency = resolved.startsWith(mobileRoot + "/")
      ? "@/" + resolved.slice(mobileRoot.length + 1)
      : resolved;
    dependencies.push(dependency);
    return `require(${JSON.stringify(dependency)})`;
  });
  modules[name] = source;
  dependencies.forEach(collect);
}
const screens = {
  new: ["@/components/bookings/new-appointment-screen", "NewAppointmentScreen"],
  detail: [
    "@/components/bookings/appointment-detail-screen",
    "AppointmentDetailScreen",
  ],
  service: [
    "@/components/management/service-editor-screen",
    "ServiceEditorScreen",
  ],
} as const;
Object.values(screens).forEach(([name]) => collect(name));

type Call = { mutation: string; args: Record<string, unknown> };
type Fixture = {
  platform: string;
  language: string;
  params: Record<string, string>;
  studio: {
    accessState?: string;
    plan: string;
    profile: { role: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  results: Record<string, unknown>;
  calls: Call[];
  queries: { query: string; args: unknown }[];
  navigation: unknown[];
  links: string[];
};
type TestWindow = Window & { mobileFixture: Fixture; renderMobile: () => void };
type Options = {
  accessState?: string;
  role?: string;
  platform?: string;
  language?: string;
  status?: string;
  isActive?: boolean;
  isOpusVisible?: boolean;
  categories?: boolean;
};

async function mount(
  page: Page,
  screen: keyof typeof screens,
  options: Options = {},
) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent('<main id="root"></main>');
  const day = Math.floor(Date.now() / 86_400_000) * 86_400_000 + 5 * 86_400_000;
  const service = {
    id: "service-one",
    name: "Haircut",
    categoryName: "Women",
    durationMins: 30,
    priceMinorUnits: 120000,
    currency: "MKD",
    staffIds: ["staff-one"],
    description: "Studio service",
    isActive: true,
    isOpusVisible: false,
  };
  if (options.categories === false)
    delete (service as Partial<typeof service>).categoryName;
  const second = { ...service, id: "service-two", categoryName: "Men" };
  const fixture: Fixture = {
    platform: options.platform ?? "ios",
    language: options.language ?? "en",
    params: {
      id: screen === "service" ? "service-one" : "booking-one",
      day: String(day),
      startAt: String(day + 9 * 3_600_000),
    },
    studio: {
      available: true,
      orgId: "studio-one",
      name: "Audit studio",
      timezone: "Europe/Skopje",
      today: day,
      now: Date.now(),
      plan: options.accessState === "legacy_free" ? "free" : "paid",
      accessState: options.accessState,
      profile: {
        name: "Ana",
        role: options.role ?? "owner",
        bookingAccess: "team",
      },
      services: [service, second],
      team: [{ id: "staff-one", name: "Ana", role: "owner" }],
    },
    results: {
      slots: [
        {
          startAt: day + 9 * 3_600_000,
          endAt: day + 9.5 * 3_600_000,
          priceMinorUnits: 120000,
        },
      ],
      appointment: {
        id: "booking-one",
        customerId: "client-one",
        customerName: "Test Client",
        customerEmail: null,
        customerPhone: null,
        staffId: "staff-one",
        staffName: "Ana",
        serviceIds: ["service-one"],
        serviceName: "Haircut",
        startAt: day + 9 * 3_600_000,
        endAt: day + 9.5 * 3_600_000,
        priceMinorUnits: 120000,
        currency: "MKD",
        status: options.status ?? "confirmed",
        note: null,
      },
      management: {
        canManage: true,
        callerId: "staff-one",
        currency: "EUR",
        slotDurationMins: 15,
        services: [
          {
            ...service,
            isActive: options.isActive ?? true,
            isOpusVisible: options.isOpusVisible ?? false,
          },
        ],
        team: [{ id: "staff-one", name: "Ana", role: "owner", isActive: true }],
      },
    },
    calls: [],
    queries: [],
    navigation: [],
    links: [],
  };
  await page.evaluate(
    ({ sources, component, fixture }) => {
      const cache: Record<string, { exports: unknown }> = {};
      function load(name: string): unknown {
        if (cache[name]) return cache[name].exports;
        if (!sources[name]) throw new Error(`Missing fixture module: ${name}`);
        const loaded = { exports: {} };
        cache[name] = loaded;
        new Function("require", "module", "exports", "process", sources[name])(
          load,
          loaded,
          loaded.exports,
          { env: { NODE_ENV: "development" } },
        );
        return loaded.exports;
      }
      const w = window as unknown as TestWindow;
      w.mobileFixture = fixture;
      const React = load("react") as typeof import("react");
      const ReactDOM = load(
        "react-dom/client",
      ) as typeof import("react-dom/client");
      const Component = (
        load(component[0]) as Record<string, import("react").ComponentType>
      )[component[1]];
      const root = ReactDOM.createRoot(document.getElementById("root")!);
      w.renderMobile = () => root.render(React.createElement(Component));
      w.renderMobile();
    },
    { sources: modules, component: screens[screen], fixture },
  );
  await expect(page.getByRole("heading", { level: 1 }))
    .toBeVisible()
    .catch((error) => {
      throw new Error(errors.join("\n") || error.message);
    });
}

async function calls(page: Page) {
  return page.evaluate(
    () => (window as unknown as TestWindow).mobileFixture.calls,
  );
}
async function patch(
  page: Page,
  changes: { accessState?: string; status?: string },
) {
  await page.evaluate((changes) => {
    const w = window as unknown as TestWindow;
    if (changes.accessState)
      w.mobileFixture.studio.accessState = changes.accessState;
    if (changes.status)
      Object.assign(w.mobileFixture.results.appointment as object, {
        status: changes.status,
      });
    w.renderMobile();
  }, changes);
}

for (const state of [undefined, "legacy_free", "trial", "paid"]) {
  test(`booking remains available for ${state ?? "older backend"}`, async ({
    page,
  }) => {
    await mount(page, "new", { accessState: state });
    await page.getByLabel("Name", { exact: true }).fill("Test Client");
    await page
      .getByRole("button", { name: "Confirm appointment", exact: true })
      .click();
    await expect.poll(async () => (await calls(page)).length).toBe(1);
    expect((await calls(page))[0]).toMatchObject({
      mutation: "create",
      args: { serviceId: "service-one", customerName: "Test Client" },
    });
  });
}

test("expired iOS owner cannot enter the form or request slots", async ({
  page,
}) => {
  await mount(page, "new", { accessState: "expired" });
  await expect(
    page.getByRole("heading", { name: "Your studio's trial has ended" }),
  ).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Confirm appointment" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open subscription" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as TestWindow).mobileFixture.queries,
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "View calendar" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as TestWindow).mobileFixture.navigation,
    ),
  ).toEqual(["/calendar"]);
  expect(await calls(page)).toEqual([]);
});

for (const role of ["manager", "staff"]) {
  test(`expired ${role} receives owner guidance without billing access`, async ({
    page,
  }) => {
    await mount(page, "new", { accessState: "expired", role, platform: "web" });
    await expect(
      page.getByText("Ask your studio owner to review the subscription."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open subscription" }),
    ).toHaveCount(0);
  });
}

test("expired web owner can open existing subscription management", async ({
  page,
}) => {
  await mount(page, "new", { accessState: "expired", platform: "web" });
  await page.getByRole("button", { name: "Open subscription" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as TestWindow).mobileFixture.links,
    ),
  ).toEqual(["https://studio.opus.mk/settings?tab=billing"]);
});

test("live trial expiry removes the draft and upgrading opens a fresh form", async ({
  page,
}) => {
  await mount(page, "new", { accessState: "trial" });
  await page.getByLabel("Name", { exact: true }).fill("Unsubmitted Client");
  await patch(page, { accessState: "expired" });
  await expect(page.getByLabel("Name", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Your studio's trial has ended" }),
  ).toBeVisible();
  expect(await calls(page)).toEqual([]);
  await patch(page, { accessState: "paid" });
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
});

test("same-name categories select the intended service ID", async ({
  page,
}) => {
  await mount(page, "new", { accessState: "trial" });
  const women = page.getByRole("button", {
    name: /Women.*Haircut|Haircut.*Women/,
  });
  const men = page.getByRole("button", { name: /Men.*Haircut|Haircut.*Men/ });
  await expect(women).toBeVisible();
  await men.click();
  await page.getByRole("button", { name: "09:00", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Category Client");
  await page
    .getByRole("button", { name: "Confirm appointment", exact: true })
    .click();
  await expect.poll(async () => (await calls(page)).length).toBe(1);
  expect((await calls(page))[0].args.serviceId).toBe("service-two");
});

test("older category-free responses still display and book services", async ({
  page,
}) => {
  await mount(page, "new", { categories: false });
  await expect(
    page.getByRole("button", { name: "Haircut", exact: true }),
  ).toBeVisible();
});

for (const [active, visible] of [
  [true, false],
  [false, true],
  [true, true],
  [false, false],
]) {
  test(`price edits preserve active=${active} and public=${visible}`, async ({
    page,
  }) => {
    await mount(page, "service", { isActive: active, isOpusVisible: visible });
    await page.getByLabel("Price (MKD)", { exact: true }).fill("1350.50");
    await page
      .getByRole("button", { name: "Save service", exact: true })
      .click();
    await expect.poll(async () => (await calls(page)).length).toBe(1);
    expect((await calls(page))[0]).toMatchObject({
      mutation: "saveService",
      args: {
        isActive: active,
        isOpusVisible: visible,
        priceMinorUnits: 135050,
        currency: "MKD",
      },
    });
  });
}

test("service visibility can change without deactivating the service", async ({
  page,
}) => {
  await mount(page, "service");
  await page
    .getByRole("switch", { name: "Visible on booking website" })
    .click();
  await page.getByRole("button", { name: "Save service", exact: true }).click();
  await expect.poll(async () => (await calls(page)).length).toBe(1);
  expect((await calls(page))[0].args).toMatchObject({
    isActive: true,
    isOpusVisible: true,
  });
});

test("completed appointments expose only the no-show correction", async ({
  page,
}) => {
  await mount(page, "detail", { status: "completed", accessState: "expired" });
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Complete appointment", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "No-show", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm no-show", exact: true })
    .click();
  await expect.poll(async () => (await calls(page)).length).toBe(1);
  expect((await calls(page))[0]).toEqual({
    mutation: "status",
    args: { bookingId: "booking-one", status: "no_show" },
  });
});

for (const action of ["Cancel", "No-show"]) {
  test(`automatic completion while ${action} confirmation is open remains safe`, async ({
    page,
  }) => {
    await mount(page, "detail");
    await page.getByRole("button", { name: action, exact: true }).click();
    await patch(page, { status: "completed" });
    await expect(
      page.getByRole("button", { name: "Confirm cancellation", exact: true }),
    ).toHaveCount(0);
    if (action === "Cancel")
      await page.getByRole("button", { name: "No-show", exact: true }).click();
    await page
      .getByRole("button", { name: "Confirm no-show", exact: true })
      .click();
    await expect.poll(async () => (await calls(page)).length).toBe(1);
    expect((await calls(page))[0].args.status).toBe("no_show");
  });
}

test("expired-trial notice has Macedonian copy", async ({ page }) => {
  await mount(page, "new", { accessState: "expired", language: "mk" });
  await expect(
    page.getByRole("heading", { name: "Пробниот период на студиото заврши" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Прегледај календар" }),
  ).toBeVisible();
});
