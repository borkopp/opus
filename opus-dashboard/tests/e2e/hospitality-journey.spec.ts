import { expect, test, type Page } from "@playwright/test";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  chooseBusinessType,
  dismissConsent,
  emailCode,
  prepareContext,
  requiredEnv,
  signIn,
} from "./support/journey";
import {
  assertHospitalityNavigation,
  captureHospitalityWorkspace,
} from "./support/hospitality-navigation";
import { exerciseFloorPlan } from "./support/floor-plan";
import { exerciseVerifiedGuestAmendment } from "./support/reservation-amendments";
import {
  exerciseLiveFloorService,
  servicePeriodBoundary,
} from "./support/floor-plan-service";

type Snapshot = {
  org: Doc<"orgs">;
  settings: Doc<"reservation_settings">;
  tables: Doc<"tables">[];
  combinations: Doc<"table_combinations">[];
  reservations: Doc<"reservations">[];
  allocations: Doc<"reservation_allocations">[];
  customers: Doc<"customers">[];
  auditLog: Doc<"audit_log">[];
  clientIdentity: {
    hasLinkedClientAccount: boolean;
    hasAuthenticatedClient: boolean;
    businessUserCount: number;
    venueStaffMembershipCount: number;
  } | null;
};
async function snapshot(slug: string, clientEmail?: string): Promise<Snapshot> {
  const response = await fetch(
    `${requiredEnv("OPUS_E2E_CONVEX_URL")}/api/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Convex ${requiredEnv("OPUS_E2E_CONVEX_ADMIN_KEY")}`,
      },
      body: JSON.stringify({
        path: "e2eFixtures:hospitalitySnapshot",
        args: { slug, ...(clientEmail ? { clientEmail } : {}) },
        format: "json",
      }),
    },
  );
  expect(response.ok).toBe(true);
  const result = await response.json();
  expect(result.status).toBe("success");
  return result.value;
}
async function select(page: Page, label: string, option: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function selectOfferedTime(
  page: Page,
  label: string,
  excluding?: string,
) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  const options = page.getByRole("option");
  await expect(options.first()).toBeVisible();
  const offered = (await options.allTextContents()).map((value) =>
    value.trim(),
  );
  const time = offered.find((value) => value !== excluding);
  expect(
    time,
    `An available ${label.toLowerCase()} must be offered`,
  ).toBeTruthy();
  await page.getByRole("option", { name: time!, exact: true }).click();
  return time!;
}
async function captureResponsive(page: Page, stage: string) {
  const initialViewport = page.viewportSize()!;
  await page.mouse.move(0, 0);
  for (const viewport of [
    { ...initialViewport, label: "desktop" },
    { width: 390, height: 844, label: "390" },
    { width: 320, height: 844, label: "320" },
  ]) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `${stage} should fit the ${viewport.label}px viewport`,
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`${stage}-${viewport.label}.png`),
      fullPage: true,
      animations: "disabled",
      style: "nextjs-portal { visibility: hidden; }",
    });
  }
  await page.setViewportSize(initialViewport);
}
async function emailManagementLink(email: string) {
  let link = "";
  await expect
    .poll(
      async () => {
        const url = new URL("/messages", requiredEnv("OPUS_E2E_MAILBOX_URL"));
        url.searchParams.set("to", email);
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${requiredEnv("OPUS_E2E_MAILBOX_TOKEN")}`,
          },
        });
        const { messages } = (await response.json()) as {
          messages: { html: string }[];
        };
        link =
          messages
            .map(
              (message) =>
                message.html.match(
                  /href="([^"]*\/reserve\/[^\"]*\/manage\/[^\"]*#token=[^"]+)"/,
                )?.[1],
            )
            .find(Boolean)
            ?.replaceAll("&amp;", "&") ?? "";
        return Boolean(link);
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  return link;
}
async function prepareReservation(
  page: Page,
  slug: string,
  date: string,
  email: string,
  name: string,
) {
  await page.goto(`/reserve/${slug}`);
  await dismissConsent(page);
  await page.getByLabel("Party size", { exact: true }).fill("4");
  await page.getByLabel("Date", { exact: true }).fill(date);
  const time = await selectOfferedTime(page, "Available time");
  await page.getByLabel("Your name", { exact: true }).fill(name);
  await page.getByLabel("Email", { exact: true }).fill(email);
  const after = Date.now();
  await page
    .getByRole("button", { name: "Send verification code", exact: true })
    .click();
  await expect(page.getByLabel("Email verification code")).toBeVisible();
  return { code: await emailCode(email, after), time };
}

test("short restaurant onboarding → dashboard and optional setup → table combinations → guest management and staff operations", async ({
  page: owner,
  context,
  browser,
  baseURL,
}) => {
  test.setTimeout(360_000);
  const suffix = Date.now().toString(36);
  const name = `E2E Restaurant ${suffix}`;
  const slug = `e2e-restaurant-${suffix}`;
  const ownerEmail = `restaurant-owner-${suffix}@example.test`;
  const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await prepareContext(context, baseURL!);
  await test.step("A new verified account reaches its private dashboard with only a name and restaurant type", async () => {
    await owner.goto("/login");
    await signIn(owner, ownerEmail);
    await expect(owner).toHaveURL(/\/onboarding(?:\?|$)/);
    await expect(
      owner.getByRole("heading", {
        name: "What kind of business do you run?",
        exact: true,
      }),
    ).toBeVisible();
    const initialViewport = owner.viewportSize()!;
    await owner.screenshot({
      path: test.info().outputPath("business-type-desktop.png"),
      fullPage: true,
    });
    await owner.setViewportSize({ width: 390, height: 844 });
    await expect(owner.getByTestId("choose-beauty")).toBeVisible();
    await expect(owner.getByTestId("choose-hospitality")).toBeVisible();
    expect(
      await owner.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await owner.screenshot({
      path: test.info().outputPath("business-type-mobile.png"),
      fullPage: true,
    });
    await owner.setViewportSize(initialViewport);
    await chooseBusinessType(owner, "Restaurants and cafés");
    await expect(owner).toHaveURL(/\/onboarding\?industry=hospitality/);
    await owner.reload();
    const venueName = owner.getByLabel("Venue name", { exact: true });
    const next = owner.getByRole("button", { name: "Next", exact: true });
    await expect(venueName).toBeVisible();
    for (const invalidName of ["", " X "]) {
      await venueName.fill(invalidName);
      await next.click();
      await expect(
        owner.getByText("Enter a venue name between 2 and 120 characters.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(venueName).toBeFocused();
      await expect(venueName).toHaveValue(invalidName);
    }
    await venueName.fill(name);
    await captureResponsive(owner, "venue-name");
    await owner.reload();
    await expect(venueName).toHaveValue(name);
    await next.click();
    const restaurant = owner.getByRole("radio", {
      name: "Restaurant",
      exact: true,
    });
    const cafe = owner.getByRole("radio", { name: "Café", exact: true });
    const openDashboard = owner.getByRole("button", {
      name: "Open dashboard",
      exact: true,
    });
    await expect(restaurant).not.toBeChecked();
    await expect(cafe).not.toBeChecked();
    await openDashboard.click();
    await expect(
      owner.getByText("Choose Café or Restaurant to continue.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(cafe).toBeFocused();
    await expect(venueName).toHaveCount(0);
    await owner.getByRole("button", { name: "Back", exact: true }).click();
    await expect(venueName).toHaveValue(name);
    await next.click();
    await restaurant.click();
    await expect(restaurant).toBeChecked();
    await captureResponsive(owner, "venue-type");
    await owner.reload();
    await expect(restaurant).toBeChecked();
    expect(await snapshot(slug)).toBeNull();
    await openDashboard.click();
    await expect(owner).toHaveURL(/\/hospitality$/);
    await expect(
      owner.getByRole("heading", { name: "Reservations", exact: true }),
    ).toBeVisible();
    await expect(owner.getByTestId("venue-setup-guide")).toBeVisible();
    await expect(
      owner.getByRole("button", { name: "Add reservation", exact: true }),
    ).toBeDisabled();
    const created = await snapshot(slug);
    expect(created.org.venueType).toBe("restaurant");
    expect(created.org.websiteStatus).toBe("unpublished");
    expect(created.org.address).toBeUndefined();
    expect(created.tables).toHaveLength(0);
    expect(created.settings.servicePeriods).toEqual([]);
    expect((await context.request.get(`/reserve/${slug}`)).status()).toBe(404);
    const slots = await context.request.post(
      `${requiredEnv("OPUS_E2E_CONVEX_URL")}/api/query`,
      {
        data: {
          path: "reservationPublic:getSlots",
          args: { slug, date, partySize: 2 },
          format: "json",
        },
      },
    );
    expect(await slots.json()).toMatchObject({ status: "success", value: [] });
    const guide = owner.getByTestId("venue-setup-guide");
    const setupTasks = guide.locator("ol").getByRole("link");
    await expect(setupTasks).toHaveCount(4);
    for (const task of await setupTasks.all()) await expect(task).toBeVisible();
    const initialDashboardViewport = owner.viewportSize()!;
    await owner.setViewportSize({ width: 390, height: 844 });
    const hoursTask = guide.locator('a[href="/hospitality/setup?tab=rules"]');
    await expect(hoursTask).toBeHidden();
    await expect(setupTasks).toHaveCount(1);
    const expand = guide.getByRole("button", {
      name: "View all setup steps",
      exact: true,
    });
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expand.click();
    const collapse = guide.getByRole("button", {
      name: "Show next step",
      exact: true,
    });
    await expect(collapse).toHaveAttribute("aria-expanded", "true");
    await expect(setupTasks).toHaveCount(4);
    for (const task of await setupTasks.all()) await expect(task).toBeVisible();
    await collapse.click();
    await expect(expand).toHaveAttribute("aria-expanded", "false");
    await expect(hoursTask).toBeHidden();
    await expect(setupTasks).toHaveCount(1);
    await owner.setViewportSize(initialDashboardViewport);
    await captureHospitalityWorkspace(
      owner,
      "empty-venue-dashboard",
      "Reservations",
    );
    await owner.reload();
    await expect(owner).toHaveURL(/\/hospitality$/);
    await expect(owner.getByTestId("venue-setup-guide")).toBeVisible();
    await owner.goto("/onboarding");
    await expect(owner).toHaveURL(/\/hospitality$/);
    await expect(owner.getByTestId("choose-hospitality")).toHaveCount(0);
  });
  await test.step("The owner follows the optional dashboard guide to configure and publish reservations", async () => {
    await owner.getByTestId("venue-setup-next").click();
    await expect(owner).toHaveURL(/\/hospitality\/setup\?tab=profile$/);
    await expect(
      owner.getByRole("heading", { name: "Venue setup", exact: true }),
    ).toBeVisible();
    await assertHospitalityNavigation(owner, "Venue setup");
    await owner
      .getByLabel("Street address", { exact: true })
      .fill("Test Street 12");
    await owner.getByLabel("City", { exact: true }).fill("Skopje");
    await owner
      .getByLabel("Contact phone", { exact: true })
      .fill("+38970123456");
    await owner
      .getByRole("button", { name: "Save venue details", exact: true })
      .click();
    await expect
      .poll(async () => (await snapshot(slug)).org.address)
      .toBe("Test Street 12");
    await owner.reload();
    await expect(
      owner.getByLabel("Street address", { exact: true }),
    ).toHaveValue("Test Street 12");
    await captureHospitalityWorkspace(owner, "venue-setup", "Venue setup");
    await owner
      .getByRole("tab", { name: "Hours & rules", exact: true })
      .click();
    await owner
      .getByLabel("Dining duration (minutes)", { exact: true })
      .fill("30");
    await owner
      .getByLabel("Table reset buffer (minutes)", { exact: true })
      .fill("0");
    await owner.getByLabel("Advance notice (hours)", { exact: true }).fill("0");
    await owner
      .getByLabel("Cancellation notice (hours)", { exact: true })
      .fill("0");
    await owner
      .getByRole("button", { name: "Add service period", exact: true })
      .click();
    await owner.getByLabel("Period 1 name", { exact: true }).fill("All day");
    const serviceBoundary = servicePeriodBoundary();
    await owner
      .getByLabel("Period 1 opens", { exact: true })
      .fill(serviceBoundary);
    await owner
      .getByLabel("Period 1 closes", { exact: true })
      .fill(serviceBoundary);
    await owner.getByLabel("Closes the next day", { exact: true }).check();
    await owner
      .getByRole("button", { name: "Save reservation rules", exact: true })
      .click();
    await expect
      .poll(async () => (await snapshot(slug)).settings.servicePeriods?.length)
      .toBe(1);
    // Saved links to the former setup tab must continue to open table management.
    await owner.goto("/hospitality/setup?tab=tables");
    await expect(owner).toHaveURL(/\/hospitality\/tables\?tab=tables$/);
    await expect(
      owner.getByRole("heading", { name: "Tables", exact: true }),
    ).toBeVisible();
    await assertHospitalityNavigation(owner, "Tables");
    for (const label of ["A", "B", "C"]) {
      await owner
        .getByRole("button", { name: "Add table", exact: true })
        .click();
      const dialog = owner.getByRole("dialog", {
        name: "Add table",
        exact: true,
      });
      await dialog.getByLabel("Table label", { exact: true }).fill(label);
      await dialog.getByLabel("Capacity", { exact: true }).fill("2");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog).not.toBeVisible();
    }
    await owner.getByRole("tab", { name: "Combinations", exact: true }).click();
    for (const labels of [
      ["A", "B"],
      ["B", "C"],
    ]) {
      await owner
        .getByRole("button", { name: "Add combination", exact: true })
        .click();
      const dialog = owner.getByRole("dialog", {
        name: "Add combination",
        exact: true,
      });
      await dialog.getByLabel("Name", { exact: true }).fill(labels.join(" + "));
      await dialog.getByLabel("Capacity", { exact: true }).fill("4");
      await dialog.getByLabel("Minimum party size", { exact: true }).fill("3");
      for (const label of labels)
        await dialog.getByLabel(`${label} · 2 guests`, { exact: true }).check();
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog).not.toBeVisible();
    }
    await owner.getByRole("tab", { name: "Overview", exact: true }).click();
    for (const label of ["A", "B", "C"])
      await expect(
        owner.getByRole("article", { name: label, exact: true }),
      ).toBeVisible();
    await captureHospitalityWorkspace(owner, "populated-tables", "Tables");
    await owner
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link", { name: "Venue setup", exact: true })
      .click();
    await owner.getByRole("tab", { name: "Website", exact: true }).click();
    await expect(
      owner.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Publish venue website", exact: true })
      .click();
    await expect
      .poll(async () => (await snapshot(slug)).org.websiteStatus)
      .toBe("published");
    expect((await snapshot(slug)).combinations).toHaveLength(2);
  });
  const contexts = await Promise.all(
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
    contexts.map(async (guestContext) => {
      await prepareContext(guestContext, baseURL!);
      return guestContext.newPage();
    }),
  );
  const emails = [
    `restaurant-alpha-${suffix}@example.test`,
    `restaurant-beta-${suffix}@example.test`,
  ];
  try {
    await test.step("Tenant website routes to the shared reservation origin", async () => {
      const tenant = new URL(baseURL!);
      tenant.hostname = `${slug}.localhost`;
      await guests[0].goto(tenant.toString());
      await expect(
        guests[0].getByRole("heading", { name, exact: true }),
      ).toBeVisible();
      await dismissConsent(guests[0]);
      await guests[0].screenshot({
        path: test.info().outputPath("venue-mobile.png"),
        fullPage: true,
      });
      await guests[0]
        .getByRole("link", { name: "Reserve a table", exact: true })
        .click();
      await expect(guests[0]).toHaveURL(new RegExp(`/reserve/${slug}`));
      expect(new URL(guests[0].url()).origin).toBe(baseURL);
      expect((await context.request.get(`/sites/${slug}`)).status()).toBe(404);
      expect((await context.request.get(`/book/${slug}`)).status()).toBe(404);
    });
    const prepared = await Promise.all(
      guests.map((page, i) =>
        prepareReservation(
          page,
          slug,
          date,
          emails[i],
          `Restaurant Guest ${i}`,
        ),
      ),
    );
    // The all-day service starts relative to real time, so its slot grid need
    // not contain a round clock time. Both guests must still race for the same
    // actually offered slot and the overlapping A+B / B+C combinations.
    expect(prepared[0].time).toBe(prepared[1].time);
    const bookingTime = prepared[0].time;
    const codes = prepared.map((reservation) => reservation.code);
    await guests[1].screenshot({
      path: test.info().outputPath("booking-320.png"),
      fullPage: true,
    });
    for (const guest of guests)
      expect(
        await guest.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    await guests[0]
      .getByLabel("Email verification code")
      .fill(codes[0] === "000000" ? "111111" : "000000");
    await guests[0]
      .getByRole("button", { name: "Confirm reservation", exact: true })
      .click();
    await expect(
      guests[0]
        .getByRole("alert")
        .filter({ hasText: "Reservation not completed" }),
    ).toContainText("incorrect");
    expect((await snapshot(slug)).reservations).toHaveLength(0);
    await Promise.all(
      guests.map((guest, i) =>
        guest.getByLabel("Email verification code").fill(codes[i]),
      ),
    );
    await Promise.all(
      guests.map((guest) =>
        guest
          .getByRole("button", { name: "Confirm reservation", exact: true })
          .click(),
      ),
    );
    await expect
      .poll(async () => (await snapshot(slug)).reservations.length)
      .toBe(1);
    const booked = (await snapshot(slug)).reservations[0];
    expect(booked.tableIds).toHaveLength(2);
    const winner = emails.indexOf(
      (await snapshot(slug)).customers.find(
        (customer) => customer._id === booked.customerId,
      )!.email!,
    );
    expect(winner).toBeGreaterThanOrEqual(0);
    const client = guests[winner];
    await expect(
      client.getByText("Reservation confirmed", { exact: true }),
    ).toBeVisible();
    await select(client, "Language", "Македонски");
    await expect(
      client.getByText("Резервацијата е потврдена", { exact: true }),
    ).toBeVisible();
    expect(
      await client.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await client.screenshot({
      path: test.info().outputPath("confirmation-macedonian.png"),
      fullPage: true,
    });
    await select(client, "Јазик", "English");
    await expect(
      guests[1 - winner]
        .getByText(/no longer available|No tables available/)
        .first(),
    ).toBeVisible();
    expect(
      (await snapshot(slug)).allocations.filter((row) => row.isActive),
    ).toHaveLength(2);
    await test.step("Floor-plan edits persist without changing active reservations or public availability", async () => {
      const before = await snapshot(slug);
      const publicSlots = async () => {
        const response = await context.request.post(
          `${requiredEnv("OPUS_E2E_CONVEX_URL")}/api/query`,
          {
            data: {
              path: "reservationPublic:getSlots",
              args: { slug, date, partySize: 4 },
              format: "json",
            },
          },
        );
        expect(response.ok()).toBe(true);
        const result = await response.json();
        expect(result.status).toBe("success");
        return result.value;
      };
      const slotsBefore = await publicSlots();
      await exerciseFloorPlan(owner, before.tables);
      const after = await snapshot(slug);
      expect(after.reservations).toEqual(before.reservations);
      expect(after.allocations).toEqual(before.allocations);
      expect(after.combinations).toEqual(before.combinations);
      const operationalTables = (rows: Snapshot["tables"]) =>
        rows.map(
          ({
            _id,
            label,
            capacity,
            minCapacity,
            floorPlanId,
            isActive,
            status,
          }) => ({
            _id,
            label,
            capacity,
            minCapacity,
            floorPlanId,
            isActive,
            status,
          }),
        );
      expect(operationalTables(after.tables)).toEqual(
        operationalTables(before.tables),
      );
      expect(await publicSlots()).toEqual(slotsBefore);
    });
    const manageUrl = await emailManagementLink(emails[winner]);
    expect(new URL(manageUrl).origin).toBe(baseURL);
    await client.goto(manageUrl);
    await expect(
      client.getByText("Your reservation", { exact: true }),
    ).toBeVisible();
    expect(new URL(client.url()).hash).toBe("");
    await client.reload();
    await expect(
      client.getByText("Your reservation", { exact: true }),
    ).toBeVisible();
    await test.step("Guest changes preserve the reservation ID and can be saved to an optional account", async () => {
      await client
        .getByRole("button", { name: "Change reservation", exact: true })
        .click();
      const newTime = await selectOfferedTime(client, "New time", bookingTime);
      expect(newTime).not.toBe(bookingTime);
      await client
        .getByRole("button", { name: "Confirm change", exact: true })
        .click();
      await expect
        .poll(async () => (await snapshot(slug)).reservations[0].revision)
        .toBe(2);
      expect((await snapshot(slug)).reservations[0]._id).toBe(booked._id);
      expect((await snapshot(slug)).reservations[0].startAt).not.toBe(
        booked.startAt,
      );
      await client
        .getByRole("link", { name: "Save to an optional account", exact: true })
        .click();
      await signIn(client, emails[winner]);
      await expect(client).toHaveURL(new RegExp(`/reserve/${slug}/manage/`));
      await client
        .getByRole("button", { name: "Save to my account", exact: true })
        .click();
      await expect
        .poll(async () => (await snapshot(slug)).reservations[0].opusUserId)
        .toBeTruthy();
      expect((await snapshot(slug, emails[winner])).clientIdentity).toEqual({
        hasLinkedClientAccount: true,
        hasAuthenticatedClient: true,
        businessUserCount: 0,
        venueStaffMembershipCount: 0,
      });
      await test.step("Staff edit this visit without transferring the verified guest's account or management link", async () => {
        await exerciseVerifiedGuestAmendment(
          owner,
          client,
          slug,
          booked._id,
          guests[1 - winner],
          manageUrl,
        );
      });
      await client
        .getByRole("link", { name: "My account", exact: true })
        .click();
      await expect(
        client.getByText("Table reservations", { exact: true }),
      ).toBeVisible();
      await client
        .getByRole("link", { name: "Manage reservation", exact: true })
        .click();
      await client
        .getByRole("button", { name: "Cancel reservation", exact: true })
        .click();
      await client
        .getByRole("button", { name: "Confirm cancellation", exact: true })
        .click();
      await expect
        .poll(async () => (await snapshot(slug)).reservations[0].status)
        .toBe("cancelled");
      expect(
        (await snapshot(slug)).allocations.filter((row) => row.isActive),
      ).toHaveLength(0);
    });
    await test.step("Returning client books without a second booking OTP", async () => {
      await client.goto(`/reserve/${slug}`);
      await client.getByLabel("Party size", { exact: true }).fill("4");
      await client.getByLabel("Date", { exact: true }).fill(date);
      await select(client, "Available time", bookingTime);
      await client
        .getByLabel("Your name", { exact: true })
        .fill("Returning Restaurant Guest");
      await client
        .getByRole("button", { name: "Confirm reservation", exact: true })
        .click();
      await expect(
        client.getByText("Reservation confirmed", { exact: true }),
      ).toBeVisible();
      expect(
        (await snapshot(slug)).reservations.filter(
          (row) => row.status === "confirmed",
        ),
      ).toHaveLength(1);
      expect(
        (await snapshot(slug)).auditLog.filter(
          (row) => row.action === "reservation.created",
        ),
      ).toHaveLength(2);
      expect((await snapshot(slug, emails[winner])).clientIdentity).toEqual({
        hasLinkedClientAccount: true,
        hasAuthenticatedClient: true,
        businessUserCount: 0,
        venueStaffMembershipCount: 0,
      });
    });
    await test.step("Staff protect upcoming reservations and complete an immediate combined-table visit on the live floor", async () => {
      await owner.goto(`/hospitality?date=${date}`);
      const returning = owner.getByTestId("reservation-row").filter({
        has: owner.getByText("Returning Restaurant Guest", { exact: true }),
      });
      await expect(returning).toBeVisible();
      await captureHospitalityWorkspace(
        owner,
        "populated-reservations",
        "Reservations",
      );
      await returning
        .getByRole("button", {
          name: "Reservation actions for Returning Restaurant Guest",
          exact: true,
        })
        .click();
      await owner
        .getByRole("menuitem", { name: "Cancel", exact: true })
        .click();
      await owner
        .getByRole("dialog", { name: "Cancel reservation", exact: true })
        .getByRole("button", { name: "Confirm cancellation", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await snapshot(slug)).reservations.filter(
              (row) => row.status === "confirmed",
            ).length,
        )
        .toBe(0);
      await exerciseLiveFloorService(owner, {
        slug,
        tableLabels: ["A", "B", "C"],
        combinationLabels: ["A + B", "B + C"],
        guestName: "Walk-in Guest",
        checkUpcoming: true,
      });
      const visit = owner.getByTestId("reservation-row").filter({
        has: owner.getByText("Walk-in Guest", { exact: true }),
      });
      // Return to the same visit to exercise the existing owner-only privacy flow.
      await owner.goto(
        `/hospitality?date=${(await snapshot(slug)).reservations.find((row) => row.guestName === "Walk-in Guest")!.serviceDate}`,
      );
      await expect(visit.getByText("completed", { exact: true })).toBeVisible();
      const final = await snapshot(slug);
      expect(final.tables.every((table) => table.status === "available")).toBe(
        true,
      );
      expect(final.allocations.filter((row) => row.isActive)).toHaveLength(0);
      expect(
        final.reservations.filter(
          (row) => row.source === "walk_in" && row.status === "completed",
        ),
      ).toHaveLength(1);
      await visit
        .getByRole("button", {
          name: "Reservation actions for Walk-in Guest",
          exact: true,
        })
        .click();
      await owner
        .getByRole("menuitem", { name: "Anonymize guest", exact: true })
        .click();
      await owner
        .getByRole("dialog", { name: "Anonymize guest details?", exact: true })
        .getByRole("button", { name: "Anonymize guest", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await snapshot(slug)).reservations.find(
              (row) => row.source === "walk_in",
            )?.guestName,
        )
        .toBe("Anonymised guest");
      expect(
        (await snapshot(slug)).allocations.filter((row) => row.isActive),
      ).toHaveLength(0);
      await owner.screenshot({
        path: test.info().outputPath("operations-desktop.png"),
        fullPage: true,
      });
      await owner.setViewportSize({ width: 390, height: 844 });
      expect(
        await owner.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await owner.screenshot({
        path: test.info().outputPath("operations-mobile.png"),
        fullPage: true,
      });
    });

    await test.step("Unconverted legacy reservations block new public bookings without changing history", async () => {
      const response = await fetch(
        `${requiredEnv("OPUS_E2E_CONVEX_URL")}/api/mutation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Convex ${requiredEnv("OPUS_E2E_CONVEX_ADMIN_KEY")}`,
          },
          body: JSON.stringify({
            path: "e2eFixtures:insertLegacyReservation",
            args: { slug },
            format: "json",
          }),
        },
      );
      expect(response.ok).toBe(true);
      const inserted = await response.json();
      expect(inserted.status).toBe("success");
      await client.goto(`/reserve/${slug}`);
      await expect(
        client.getByText("Online reservations are paused", { exact: true }),
      ).toBeVisible();
      await expect(client.locator("form")).toHaveCount(0);
      const slots = await context.request.post(
        `${requiredEnv("OPUS_E2E_CONVEX_URL")}/api/query`,
        {
          data: {
            path: "reservationPublic:getSlots",
            args: { slug, date, partySize: 4 },
            format: "json",
          },
        },
      );
      expect(await slots.json()).toMatchObject({
        status: "success",
        value: [],
      });
      const legacy = (await snapshot(slug)).reservations.find(
        (row) => row._id === inserted.value,
      );
      expect(legacy?.schemaVersion).toBeUndefined();
      expect(legacy?.status).toBe("confirmed");
    });
  } finally {
    for (const guestContext of contexts) await guestContext.close();
  }
});
