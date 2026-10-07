import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, vi } from "vitest";
import { ReminderTimesField } from "../components/notifications/ReminderTimesField";

vi.mock("@/components/dashboard-i18n-provider", () => ({
  useDashboardI18n: () => ({ t: (english: string) => english }),
}));

test("a studio can reselect its custom reminder time before saving a deselection", () => {
  const markup = renderToStaticMarkup(
    createElement(ReminderTimesField, {
      id: "legacy-reminder",
      savedHours: [48, 3],
      hours: [3],
      onChange: () => {},
    }),
  );
  const customChoice = markup.match(/<button[^>]*>48 hours<\/button>/)?.[0];
  expect(customChoice).toBeDefined();
  expect(customChoice).toContain('data-state="off"');
  expect(customChoice).not.toContain('disabled=""');
});
