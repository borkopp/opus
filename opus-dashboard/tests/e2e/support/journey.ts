import { expect, type BrowserContext, type Page } from "@playwright/test";
import type { Doc } from "../../../convex/_generated/dataModel";
import { formatBookingDateValue } from "../../../lib/public-booking-format";
import { waitForAuthEmailSend } from "./auth-pacing";

export type StudioSnapshot = {
  org: Doc<"orgs">;
  settings: Doc<"org_settings">;
  staff: Doc<"staff_members">[];
  services: Doc<"services">[];
  bookings: Doc<"bookings">[];
  customers: Doc<"customers">[];
  notifications: Doc<"notifications">[];
  auditLog: Doc<"audit_log">[];
};

export function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing isolated test environment: ${name}`);
  return value;
}

export async function studioSnapshot(slug: string): Promise<StudioSnapshot> {
  const response = await fetch(
    `${requiredEnv("OPUS_E2E_CONVEX_URL")}/api/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Convex ${requiredEnv("OPUS_E2E_CONVEX_ADMIN_KEY")}`,
      },
      body: JSON.stringify({
        path: "e2eFixtures:studioSnapshot",
        args: { slug },
        format: "json",
      }),
    },
  );
  if (!response.ok)
    throw new Error(`Fixture read failed: HTTP ${response.status}`);
  const result = await response.json();
  if (result.status !== "success")
    throw new Error(`Fixture read failed: ${result.errorMessage}`);
  return result.value;
}

type TestEmail = {
  receivedAt: number;
  subject: string;
  text: string;
  html: string;
};

export async function emailCode(email: string, after: number) {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        const url = new URL("/messages", requiredEnv("OPUS_E2E_MAILBOX_URL"));
        url.searchParams.set("to", email);
        url.searchParams.set("after", String(after));
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${requiredEnv("OPUS_E2E_MAILBOX_TOKEN")}`,
          },
        });
        if (!response.ok)
          throw new Error(`Test mailbox failed: HTTP ${response.status}`);
        const { messages } = (await response.json()) as {
          messages: TestEmail[];
        };
        code = messages
          .toSorted((a, b) => b.receivedAt - a.receivedAt)
          .map((message) => message.text.match(/\b\d{6}\b/)?.[0])
          .find(Boolean);
        return Boolean(code);
      },
      {
        message: `An actual OTP must reach the local mailbox for ${email}`,
        timeout: 30_000,
      },
    )
    .toBe(true);
  return code!;
}

/** Stub only geocoding at the provider boundary; application and Convex calls stay real. */
export async function prepareContext(context: BrowserContext, baseURL: string) {
  await context.addCookies([
    { name: "opus_locale", value: "en", url: baseURL },
  ]);
  await context.route(
    "https://api.mapbox.com/geocoding/v5/mapbox.places/**",
    (route) =>
      route.fulfill({
        json: {
          type: "FeatureCollection",
          features: [
            {
              id: "address.e2e",
              type: "Feature",
              place_type: ["address"],
              text: "Test Street",
              address: "10",
              place_name: "10 Test Street, Skopje, North Macedonia",
              center: [21.4314, 41.9981],
              context: [
                { id: "place.skopje", text: "Skopje" },
                { id: "country.mk", text: "North Macedonia", short_code: "mk" },
              ],
            },
          ],
        },
      }),
  );
}

export async function dismissConsent(page: Page) {
  const decline = page.getByRole("button", {
    name: /Necessary only|Само неопходни|Само потребни/i,
  });
  if (await decline.isVisible()) await decline.click();
}

export async function signIn(page: Page, email: string) {
  await expect(page.locator("#auth-email")).toBeVisible();
  await dismissConsent(page);
  await page.locator("#auth-email").fill(email);
  await waitForAuthEmailSend();
  const requestedAt = Date.now();
  await page
    .getByRole("button", { name: /Continue with email|Продолжи со е-пошта/ })
    .click();
  await page.locator("#auth-code").fill(await emailCode(email, requestedAt));
  await page
    .getByRole("button", { name: /Verify and continue|Потврди и продолжи/ })
    .click();
}

export async function chooseBusinessType(
  page: Page,
  type: "Beauty" | "Restaurants and cafés",
) {
  await expect(
    page.getByRole("heading", {
      name: "What kind of business do you run?",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByTestId(type === "Beauty" ? "choose-beauty" : "choose-hospitality")
    .click();
}

export async function launchStudio(page: Page, name: string, email: string) {
  await page.goto("/login");
  await signIn(page, email);
  await expect(page).toHaveURL(/\/onboarding(?:\?|$)/);
  await chooseBusinessType(page, "Beauty");
  const progress = page.getByRole("progressbar", { name: "Studio setup" });
  await expect(progress).toHaveAttribute("aria-valuemax", "7");
  await page.getByLabel("Studio name", { exact: true }).fill(name);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.locator('label[for="category-hair_salon"]').click();
  await expect(page.getByLabel("Hair salon", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // A reload must resume setup without a second account or studio.
  await page.reload();
  await page.getByLabel("Your name", { exact: true }).fill("Journey Owner");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByLabel("Studio address", { exact: true })
    .fill("10 Test Street");
  await page.getByRole("option", { name: /10 Test Street/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByLabel("Service name", { exact: true })
    .fill("Journey Haircut");
  await page.getByLabel("Price (MKD)", { exact: true }).fill("500");
  await page.getByLabel("Duration (minutes)", { exact: true }).fill("30");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  for (const day of [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]) {
    const button = page.getByRole("button", { name: day, exact: true });
    if ((await button.getAttribute("aria-pressed")) !== "true")
      await button.click();
  }
  await page.getByLabel("Opens", { exact: true }).fill("08:00");
  await page.getByLabel("Closes", { exact: true }).fill("18:00");
  await page
    .getByRole("button", { name: "Confirm working hours", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your booking website is ready" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Publish my booking website", exact: true })
    .click();
  await expect(page).toHaveURL(/\/beauty(?:\?|$)/);
}

export async function prepareGuest(
  page: Page,
  slug: string,
  date: string,
  time: string,
  name: string,
  email: string,
  phone: string,
) {
  await page.goto(`/book/${slug}?date=${date}&lang=mk`);
  await dismissConsent(page);
  await page.getByRole("button", { name: /Journey Haircut/ }).click();
  await page
    .getByRole("button", { name: "Journey Owner", exact: true })
    .click();
  const dayLabel = formatBookingDateValue(date, "mk");
  await page
    .getByRole("button", {
      name: new RegExp(dayLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    })
    .click();
  await page.getByRole("button", { name: time, exact: true }).click();
  await page.getByRole("button", { name: /^(Continue|Продолжи)$/ }).click();
  await page.locator("#customer-name").fill(name);
  await page.locator("#customer-email").fill(email);
  await page.locator("#customer-phone").fill(phone);
  await expect(page.locator("#create-client-account")).not.toBeChecked();
  const requestedAt = Date.now();
  await page
    .getByRole("button", {
      name: /Send confirmation code|Испрати код за потврда/,
    })
    .click();
  await expect(page.locator("#booking-otp-input")).toBeVisible();
  return emailCode(email, requestedAt);
}

export const confirmAppointment = (page: Page) =>
  page.getByRole("button", {
    name: /^(Confirm the appointment|Потврди го терминот)$/,
  });
export const bookingSuccess = (page: Page) =>
  page.getByRole("heading", {
    name: /Your appointment is booked|Терминот е зачуван/,
  });

export async function openCalendarBooking(
  page: Page,
  date: string,
  name: string,
  view: "Horizontal" | "Day" | "Week" | "Month" | "Agenda" = "Agenda",
) {
  await page.goto(`/beauty/bookings?date=${date}`);
  await page
    .getByRole("combobox", { name: "Calendar view", exact: true })
    .click();
  await page.getByRole("option", { name: view, exact: true }).click();
  await page.getByRole("button", { name: new RegExp(name) }).click();
}
