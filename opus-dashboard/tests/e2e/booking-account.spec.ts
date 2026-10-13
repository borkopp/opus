import { expect, test, type Page } from "@playwright/test";
import { waitForAuthEmailSend } from "./support/auth-pacing";
import {
  bookingSuccess,
  confirmAppointment,
  dismissConsent,
  emailCode,
  launchStudio,
  prepareContext,
  studioSnapshot,
} from "./support/journey";

async function chooseAppointment(
  page: Page,
  slug: string,
  date: string,
  time: string,
) {
  // The supported date prefill avoids depending on the current calendar month.
  await page.goto(`/book/${slug}?date=${date}&lang=mk`);
  await dismissConsent(page);
  await page.getByRole("button", { name: /Journey Haircut/ }).click();
  await page
    .getByRole("button", { name: "Journey Owner", exact: true })
    .click();
  await page
    .locator("[data-booking-time-panel]")
    .getByRole("button", { name: time, exact: true })
    .click();
  await page.getByRole("button", { name: /^(Continue|Продолжи)$/ }).click();
  await expect(page.locator("#customer-email")).toBeVisible();
}

test("inline client account creation confirms the booking and remembers the client for the next appointment", async ({
  page: owner,
  context,
  browser,
  baseURL,
}) => {
  const suffix = Date.now().toString(36);
  const studioName = `E2E Booking Account ${suffix}`;
  const slug = `e2e-booking-account-${suffix}`;
  const ownerEmail = `account-owner-${suffix}@example.test`;
  const clientEmail = `inline-client-${suffix}@example.test`;
  const clientName = "Inline Account Client";
  const phone = "+38970123458";
  const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

  await prepareContext(context, baseURL!);
  await test.step("A new owner completes onboarding and publishes through the UI", async () => {
    await launchStudio(owner, studioName, ownerEmail);
    const snapshot = await studioSnapshot(slug);
    expect(snapshot.org.websiteStatus).toBe("published");
    expect(snapshot.bookings).toHaveLength(0);
  });

  const clientContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    locale: "en-GB",
    timezoneId: "Europe/Skopje",
  });
  try {
    await prepareContext(clientContext, baseURL!);
    const client = await clientContext.newPage();

    await test.step("A fresh guest opts into an account and confirms with the actual emailed code", async () => {
      await chooseAppointment(client, slug, date, "10:00");
      await client.locator("#customer-name").fill(clientName);
      await client.locator("#customer-email").fill(clientEmail);
      await client.locator("#customer-phone").fill(phone);
      const createAccount = client.locator("#create-client-account");
      await expect(createAccount).not.toBeChecked();
      await createAccount.check();
      await expect(createAccount).toBeChecked();

      const sendCode = client.getByRole("button", {
        name: /^(Send confirmation code|Испрати код за потврда)$/,
      });
      // Checking the option starts the real localhost auth-security policy query.
      await expect(sendCode).toBeEnabled();
      await waitForAuthEmailSend();
      const requestedAt = Date.now();
      await sendCode.click();
      await expect(client.locator("#booking-otp-input")).toBeVisible();
      expect((await studioSnapshot(slug)).bookings).toHaveLength(0);
      await client
        .locator("#booking-otp-input")
        .fill(await emailCode(clientEmail, requestedAt));
      await confirmAppointment(client).click();
      await expect(bookingSuccess(client)).toBeVisible();

      const snapshot = await studioSnapshot(slug);
      expect(snapshot.bookings).toHaveLength(1);
      expect(snapshot.bookings[0]).toMatchObject({
        status: "confirmed",
        source: "opus_web",
        startAt: Date.parse(`${date}T10:00:00Z`),
        endAt: Date.parse(`${date}T10:30:00Z`),
      });
      const customer = snapshot.customers.find(
        (item) => item._id === snapshot.bookings[0].customerId,
      );
      expect(customer).toMatchObject({
        name: clientName,
        email: clientEmail,
        phone,
      });
      expect(customer?.opusUserId).toBeTruthy();
      expect(snapshot.staff).toHaveLength(1);
      expect(
        snapshot.auditLog.filter((event) => event.action === "booking.created"),
      ).toHaveLength(1);
    });

    await test.step("The account is already signed in and owns the appointment without a claim link", async () => {
      await client
        .getByRole("button", {
          name: /^(Open my OPUS account|Отвори ја мојата OPUS сметка)$/,
        })
        .click();
      await expect(client).toHaveURL(/\/account$/);
      await expect(
        client.getByRole("heading", {
          name: /^(My appointments|Мои термини)$/,
        }),
      ).toBeVisible();
      await expect(
        client.getByText("Journey Haircut", { exact: true }),
      ).toBeVisible();
      await expect(
        client.getByText(clientEmail, { exact: true }),
      ).toBeVisible();
      await expect(client.locator("#auth-email")).toHaveCount(0);
      expect((await studioSnapshot(slug)).bookings).toHaveLength(1);
    });

    await test.step("The returning session books again with remembered details and no second OTP", async () => {
      await chooseAppointment(client, slug, date, "11:00");
      await expect(client.locator("#customer-name")).toHaveValue(clientName);
      await expect(client.locator("#customer-email")).toHaveValue(clientEmail);
      await expect(client.locator("#customer-email")).toHaveAttribute(
        "readonly",
        "",
      );
      await expect(client.locator("#customer-phone")).toHaveValue(phone);
      await expect(client.locator("#create-client-account")).toHaveCount(0);
      await client
        .getByRole("button", {
          name: /^(Confirm appointment|Потврди термин)$/,
        })
        .click();
      await expect(bookingSuccess(client)).toBeVisible();
      await expect(client.locator("#booking-otp-input")).toHaveCount(0);

      const snapshot = await studioSnapshot(slug);
      expect(snapshot.bookings).toHaveLength(2);
      expect(
        snapshot.bookings.every((booking) => booking.status === "confirmed"),
      ).toBe(true);
      expect(
        snapshot.bookings.every((booking) => booking.source === "opus_web"),
      ).toBe(true);
      expect(
        snapshot.bookings.map((booking) => booking.startAt).sort(),
      ).toEqual([
        Date.parse(`${date}T10:00:00Z`),
        Date.parse(`${date}T11:00:00Z`),
      ]);
      expect(snapshot.customers).toHaveLength(1);
      expect(snapshot.customers[0].opusUserId).toBeTruthy();
      expect(
        snapshot.bookings.every(
          (booking) => booking.customerId === snapshot.customers[0]._id,
        ),
      ).toBe(true);

      await client.goto("/account");
      await expect(
        client.getByRole("heading", {
          name: /^(My appointments|Мои термини)$/,
        }),
      ).toBeVisible();
      await expect(
        client.getByText("Journey Haircut", { exact: true }),
      ).toHaveCount(2);
    });
  } finally {
    await clientContext.close();
  }
});
