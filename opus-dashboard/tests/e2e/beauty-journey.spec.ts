import { expect, test } from "@playwright/test";
import {
  bookingSuccess,
  confirmAppointment,
  dismissConsent,
  launchStudio,
  openCalendarBooking,
  prepareContext,
  prepareGuest,
  requiredEnv,
  signIn,
  studioSnapshot,
} from "./support/journey";

test("beauty launch → verified guest race → calendar → reschedule → client and staff cancellation", async ({
  page: owner,
  context,
  browser,
  baseURL,
}) => {
  const suffix = Date.now().toString(36);
  const studioName = `E2E Beauty ${suffix}`;
  const slug = `e2e-beauty-${suffix}`;
  const ownerEmail = `owner-${suffix}@example.test`;
  const guestNames = ["Journey Guest Alpha", "Journey Guest Beta"];
  const guestEmails = [
    `alpha-${suffix}@example.test`,
    `beta-${suffix}@example.test`,
  ];
  const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const newDate = new Date(Date.now() + 4 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  await prepareContext(context, baseURL!);
  await test.step("Owner signs in with a real OTP, resumes setup, and publishes", async () => {
    await launchStudio(owner, studioName, ownerEmail);
    const snapshot = await studioSnapshot(slug);
    expect(snapshot.org.websiteStatus).toBe("published");
    expect(snapshot.staff).toHaveLength(1);
    expect(snapshot.services).toHaveLength(1);
    expect(snapshot.services[0]).toMatchObject({
      name: "Journey Haircut",
      durationMins: 30,
      priceMinorUnits: 50_000,
      currency: "MKD",
    });
    expect(snapshot.bookings).toHaveLength(0);
    expect((await context.request.get(`/reserve/${slug}`)).status()).toBe(404);
  });

  const guestContexts = await Promise.all(
    [390, 320].map((width) =>
      browser.newContext({
        baseURL,
        viewport: { width, height: 844 },
        locale: "en-GB",
        timezoneId: "Europe/Skopje",
      }),
    ),
  );
  const guests = await Promise.all(
    guestContexts.map(async (guestContext) => {
      await prepareContext(guestContext, baseURL!);
      return guestContext.newPage();
    }),
  );
  try {
    await test.step("Published tenant website routes guests to the shared booking origin", async () => {
      const tenant = new URL(baseURL!);
      tenant.hostname = `${slug}.localhost`;
      await guests[0].goto(tenant.toString());
      await expect(
        guests[0].getByRole("heading", { name: studioName, exact: true }),
      ).toBeVisible();
      await dismissConsent(guests[0]);
      await guests[0].locator('a[href*="/book"]:visible').first().click();
      await expect(guests[0]).toHaveURL(new RegExp(`/book/${slug}`));
      expect(new URL(guests[0].url()).origin).toBe(baseURL);
      const forbidden = await context.request.get(`/sites/${slug}`);
      expect(forbidden.status()).toBe(404);
    });

    const codes =
      await test.step("Two fresh guests choose the same slot without creating accounts", async () => {
        const result = await Promise.all(
          guests.map((guest, index) =>
            prepareGuest(
              guest,
              slug,
              date,
              "10:00",
              guestNames[index],
              guestEmails[index],
              `+3897012345${index}`,
            ),
          ),
        );
        expect((await studioSnapshot(slug)).bookings).toHaveLength(0);
        for (const guest of guests) {
          expect(
            await guest.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
        }
        return result;
      });

    await test.step("A wrong verification code cannot create an appointment", async () => {
      await guests[0]
        .locator("#booking-otp-input")
        .fill(codes[0] === "000000" ? "111111" : "000000");
      await confirmAppointment(guests[0]).click();
      await expect(guests[0].locator("#booking-otp-error")).toBeVisible();
      expect((await studioSnapshot(slug)).bookings).toHaveLength(0);
    });

    const booked =
      await test.step("Concurrent valid confirmations create exactly one booking", async () => {
        await Promise.all(
          guests.map((guest, index) =>
            guest.locator("#booking-otp-input").fill(codes[index]),
          ),
        );
        await Promise.all(
          guests.map((guest) => confirmAppointment(guest).click()),
        );
        await expect
          .poll(
            async () =>
              (await studioSnapshot(slug)).bookings.filter(
                (booking) => booking.status === "confirmed",
              ).length,
          )
          .toBe(1);
        const snapshot = await studioSnapshot(slug);
        const booking = snapshot.bookings.find(
          (item) => item.status === "confirmed",
        )!;
        const customer = snapshot.customers.find(
          (item) => item._id === booking.customerId,
        )!;
        const winner = guestEmails.indexOf(customer.email!);
        expect(winner).toBeGreaterThanOrEqual(0);
        await expect(bookingSuccess(guests[winner])).toBeVisible();
        await expect(
          guests[1 - winner].locator("#booking-otp-error"),
        ).toContainText(/available|слободен|достапен|зафатен|резервиран/i);
        expect(customer.opusUserId).toBeUndefined();
        expect(
          snapshot.auditLog.some(
            (event) =>
              event.action === "booking.created" &&
              event.resourceId === booking._id,
          ),
        ).toBe(true);
        // Reopening the confirmation does not submit a second appointment.
        await guests[winner].reload();
        expect(
          (await studioSnapshot(slug)).bookings.filter(
            (item) => item.status === "confirmed",
          ),
        ).toHaveLength(1);
        return { booking, winner };
      });

    // Claim through the delivered confirmation link, preserving the guest-first booking.
    // The snapshot omits claim credentials; proof comes from the actual email template.
    const client = guests[booked.winner];
    await test.step("The verified guest claims the appointment in their optional client account", async () => {
      const mailbox = new URL("/messages", process.env.OPUS_E2E_MAILBOX_URL!);
      mailbox.searchParams.set("to", guestEmails[booked.winner]);
      let claimLink = "";
      await expect
        .poll(
          async () => {
            const response = await fetch(mailbox, {
              headers: {
                Authorization: `Bearer ${process.env.OPUS_E2E_MAILBOX_TOKEN}`,
              },
            });
            const { messages } = (await response.json()) as {
              messages: { html: string }[];
            };
            claimLink =
              messages
                .map(
                  (message) =>
                    message.html.match(
                      /href="([^"]*\/account\?claim=[^"]+)"/,
                    )?.[1],
                )
                .find(Boolean)
                ?.replaceAll("&amp;", "&") ?? "";
            return Boolean(claimLink);
          },
          { timeout: 30_000 },
        )
        .toBe(true);
      expect(new URL(claimLink).origin).toBe(baseURL);
      await client.goto(claimLink);
      await expect(client).toHaveURL(/\/account\/sign-in/);
      await signIn(client, guestEmails[booked.winner]);
      await expect(
        client.getByRole("heading", { name: "My appointments", exact: true }),
      ).toBeVisible();
      await expect(
        client.getByText("Journey Haircut", { exact: true }),
      ).toBeVisible();
      await expect
        .poll(
          async () =>
            (await studioSnapshot(slug)).customers.find(
              (item) => item._id === booked.booking.customerId,
            )?.opusUserId,
        )
        .toBeTruthy();
    });

    await test.step("Staff see the booking and reschedule it through the calendar", async () => {
      for (const view of ["Horizontal", "Day", "Week", "Month"] as const) {
        await openCalendarBooking(owner, date, guestNames[booked.winner], view);
        await owner
          .getByRole("button", { name: "Reschedule", exact: true })
          .click();
        const picker = owner.getByRole("dialog", {
          name: "Reschedule appointment",
          exact: true,
        });
        await expect(picker).toBeVisible();
        await picker
          .getByRole("button", { name: "Keep appointment", exact: true })
          .click();
        await expect(picker).not.toBeVisible();
      }
      await openCalendarBooking(owner, date, guestNames[booked.winner]);
      await owner
        .getByRole("button", { name: "Reschedule", exact: true })
        .click();
      const dialog = owner.getByRole("dialog", {
        name: "Reschedule appointment",
        exact: true,
      });
      await expect(dialog).toBeVisible();
      await dialog.getByLabel("New date", { exact: true }).fill(newDate);
      await dialog
        .getByRole("button", { name: "Select 13:00", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Confirm new time", exact: true })
        .click();
      await expect(dialog).not.toBeVisible();
      await expect
        .poll(
          async () =>
            (await studioSnapshot(slug)).bookings.find(
              (item) => item.status === "confirmed",
            )?.startAt,
        )
        .toBe(Date.parse(`${newDate}T13:00:00Z`));
      const snapshot = await studioSnapshot(slug);
      expect(
        snapshot.bookings.find((item) => item._id === booked.booking._id)
          ?.status,
      ).toBe("cancelled");
      expect(
        snapshot.bookings.filter((item) => item.status === "confirmed"),
      ).toHaveLength(1);
      await client.reload();
      await expect(client.getByText(/13:00/)).toBeVisible();
    });

    await test.step("The client cancels the rescheduled appointment within policy", async () => {
      await client
        .getByRole("button", { name: "Cancel appointment", exact: true })
        .click();
      await client
        .getByRole("button", { name: "Confirm cancellation", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await studioSnapshot(slug)).bookings.filter(
              (item) => item.status === "confirmed",
            ).length,
        )
        .toBe(0);
      const movedAppointment = client
        .locator('[data-slot="card"]')
        .filter({ hasText: "13:00" });
      await expect(
        movedAppointment.getByText("Cancelled", { exact: true }),
      ).toBeVisible();
      await expect(
        movedAppointment.getByRole("button", {
          name: "Cancel appointment",
          exact: true,
        }),
      ).toHaveCount(0);
    });

    await test.step("A fresh guest can reuse the released slot and staff can cancel it", async () => {
      const loser = 1 - booked.winner;
      const email = `gamma-${suffix}@example.test`;
      const code = await prepareGuest(
        guests[loser],
        slug,
        newDate,
        "13:00",
        "Journey Guest Gamma",
        email,
        "+38970123459",
      );
      await guests[loser].locator("#booking-otp-input").fill(code);
      await confirmAppointment(guests[loser]).click();
      await expect(bookingSuccess(guests[loser])).toBeVisible();
      await openCalendarBooking(owner, newDate, "Journey Guest Gamma");
      await owner.getByRole("button", { name: "Cancel", exact: true }).click();
      await expect
        .poll(
          async () =>
            (await studioSnapshot(slug)).bookings.filter(
              (item) => item.status === "confirmed",
            ).length,
        )
        .toBe(0);
      const snapshot = await studioSnapshot(slug);
      expect(
        snapshot.auditLog.filter(
          (event) => event.action === "booking.cancelled",
        ).length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        snapshot.customers.find((item) => item.email === email)?.opusUserId,
      ).toBeUndefined();
    });
  } finally {
    await Promise.all(
      guestContexts.map((guestContext) => guestContext.close()),
    );
  }
});

test("retired public chat stays disabled", async ({ request }) => {
  const response = await request.post("/api/chat", {
    data: { orgId: "forged", sessionId: "forged", message: "Book me" },
  });
  expect(response.status()).toBe(410);
  expect(await response.json()).toEqual({
    error: "Web chat is no longer available.",
  });
  expect((await request.get("/api/chat")).status()).toBe(410);
});

test("missing venues and invalid reservation proof remain private", async ({
  page,
  request,
}) => {
  const enabled = await request.post(
    `${requiredEnv("OPUS_E2E_CONVEX_URL")}/api/query`,
    { data: { path: "reservationPublic:isEnabled", args: {}, format: "json" } },
  );
  expect(enabled.ok()).toBe(true);
  expect(await enabled.json()).toMatchObject({
    status: "success",
    value: true,
  });

  const response = await page.goto("/reserve/anyslug");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "404", exact: true }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await page.goto("/reserve/anyslug/manage/anyid");
  await expect(
    page.getByText("Reservation link unavailable", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /change reservation|cancel reservation|confirm/i,
    }),
  ).toHaveCount(0);
});
