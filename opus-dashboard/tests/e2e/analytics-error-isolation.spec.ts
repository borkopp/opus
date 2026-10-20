import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import ts from "typescript";

const workspacePath =
  "app/(dashboard)/beauty/analytics/_components/AnalyticsWorkspace.tsx";
const boundaryPath =
  "app/(dashboard)/beauty/analytics/_components/AnalyticsQueryBoundary.tsx";

function compile(path: string) {
  return ts.transpileModule(readFileSync(resolve(path), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
}

// Mount the real workspace and error boundary in a browser with deterministic
// Convex responses. No development server, session or production data is used.
const modules: Record<string, string> = {
  react: readFileSync(
    resolve("node_modules/react/cjs/react.development.js"),
    "utf8",
  ),
  "react/jsx-runtime": readFileSync(
    resolve("node_modules/react/cjs/react-jsx-runtime.development.js"),
    "utf8",
  ),
  "react-dom": readFileSync(
    resolve("node_modules/react-dom/cjs/react-dom.development.js"),
    "utf8",
  ),
  "react-dom/client": readFileSync(
    resolve("node_modules/react-dom/cjs/react-dom-client.development.js"),
    "utf8",
  ),
  scheduler: readFileSync(
    resolve("node_modules/scheduler/cjs/scheduler.development.js"),
    "utf8",
  ),
  workspace: compile(workspacePath),
  "./AnalyticsQueryBoundary": compile(boundaryPath),
  "@/lib/analytics-filters": compile("lib/analytics-filters.ts"),
  "@/lib/analytics-demo": "exports.buildAnalyticsDemo = () => ({});",
  "@/convex/_generated/api": `
    exports.api = {
      users: { getMyProfile: "profile" },
      studioAnalytics: { getDashboard: "analytics", getReport: "report" }
    };
  `,
  "convex/react": `
    const React = require("react");
    exports.useQuery = (query, args) => {
      React.useSyncExternalStore(
        listener => {
          window.fixture.listeners.add(listener);
          return () => window.fixture.listeners.delete(listener);
        },
        () => window.fixture.version
      );
      if (args === "skip") return undefined;
      if (query === "profile") return {
        orgId: "studio-one", plan: "paid", bookingAccess: "all"
      };
      if (query === "analytics" && window.fixture.failed)
        throw new Error("This studio exceeds the analytics report limit.");
      return {};
    };
    exports.useConvex = () => ({ action: async () => ({}) });
  `,
  "@/components/dashboard-i18n-provider": `
    exports.useDashboardI18n = () => ({
      t: (en) => en, locale: "en-GB", language: "en"
    });
  `,
  "@/components/ui/button": `
    const React = require("react");
    exports.Button = ({ children, variant, ...props }) =>
      React.createElement("button", props, children);
  `,
  "@/components/ui/skeleton": `
    const React = require("react");
    exports.Skeleton = () => React.createElement("div", null, "Loading");
  `,
  "lucide-react": `
    const React = require("react");
    exports.ChartNoAxesCombined = () => React.createElement("span");
  `,
  "@/components/analytics/AnalyticsDashboard": `
    const React = require("react");
    exports.AnalyticsDashboard = ({ clients }) =>
      React.createElement("section", null,
        React.createElement("h1", null, "Analytics loaded"),
        React.createElement("button", {
          onClick: () => window.fixture.update(true)
        }, "Simulate analytics limit"),
        clients
      );
  `,
  "@/components/analytics/AnalyticsClientDirectory": `
    const React = require("react");
    exports.AnalyticsClientDirectory = () => {
      const [search, setSearch] = React.useState("");
      const [selected, setSelected] = React.useState(false);
      return React.createElement("section", null,
        React.createElement("h2", null, "Client directory"),
        React.createElement("input", {
          "aria-label": "Search clients", value: search,
          onChange: event => setSearch(event.target.value)
        }),
        React.createElement("button", {
          onClick: () => setSelected(true)
        }, "Open Ana"),
        selected && React.createElement("div", { role: "dialog" }, "Ana profile")
      );
    };
  `,
};

async function mountWorkspace(page: Page, failed = false) {
  await page.setContent('<main id="root"></main>');
  await page.evaluate(
    ({ sources, initiallyFailed }) => {
      const cache: Record<string, { exports: unknown }> = {};
      function requireModule(name: string) {
        if (cache[name]) return cache[name].exports;
        if (!sources[name]) throw new Error(`Missing fixture module: ${name}`);
        const loaded = { exports: {} };
        cache[name] = loaded;
        new Function("require", "module", "exports", "process", sources[name])(
          requireModule,
          loaded,
          loaded.exports,
          { env: { NODE_ENV: "development" } },
        );
        return loaded.exports;
      }
      const fixture = {
        failed: initiallyFailed,
        version: 0,
        listeners: new Set<() => void>(),
        update(next: boolean) {
          this.failed = next;
          this.version += 1;
          this.listeners.forEach((listener) => listener());
        },
      };
      Object.assign(window, { fixture });
      const React = requireModule("react") as typeof import("react");
      const ReactDOM = requireModule(
        "react-dom/client",
      ) as typeof import("react-dom/client");
      const { AnalyticsWorkspace } = requireModule("workspace") as {
        AnalyticsWorkspace: () => import("react").ReactNode;
      };
      ReactDOM.createRoot(document.getElementById("root")!).render(
        React.createElement(AnalyticsWorkspace),
      );
    },
    { sources: modules, initiallyFailed: failed },
  );
}

test.use({ channel: process.env.PLAYWRIGHT_CHANNEL });

test("an initial analytics error leaves the client directory usable", async ({
  page,
}) => {
  await mountWorkspace(page, true);
  await expect(page.getByRole("alert")).toContainText(
    "Analytics couldn’t load",
  );
  await page.getByRole("textbox", { name: "Search clients" }).fill("Ana");
  await page.getByRole("button", { name: "Open Ana" }).click();
  await expect(page.getByRole("dialog")).toContainText("Ana profile");
});

test("analytics errors and retries preserve client search and open profile", async ({
  page,
}) => {
  await mountWorkspace(page);
  await page.getByRole("textbox", { name: "Search clients" }).fill("Ana");
  await page.getByRole("button", { name: "Open Ana" }).click();
  await page.getByRole("button", { name: "Simulate analytics limit" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "You can still use your client directory below.",
  );
  await expect(
    page.getByRole("textbox", { name: "Search clients" }),
  ).toHaveValue("Ana");
  await expect(page.getByRole("dialog")).toContainText("Ana profile");

  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Ana profile");

  await page.evaluate(() => {
    const { fixture } = window as unknown as {
      fixture: { update: (failed: boolean) => void };
    };
    fixture.update(false);
  });
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("heading", { name: "Analytics loaded" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Search clients" }),
  ).toHaveValue("Ana");
  await expect(page.getByRole("dialog")).toContainText("Ana profile");
});
