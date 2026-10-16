import { expect, test, type Page } from "@playwright/test";
import {
  launchStudio,
  prepareContext,
  requiredEnv,
  signIn,
  studioSnapshot,
} from "./support/journey";
import {
  assertHospitalityNavigation,
  captureHospitalityWorkspace,
} from "./support/hospitality-navigation";
import {
  exerciseLiveFloorService,
  floorServiceSnapshot,
  servicePeriodBoundary,
} from "./support/floor-plan-service";
import { exerciseStaffReservationAmendments } from "./support/reservation-amendments";
import { exerciseReservationSearch } from "./support/reservation-search";
import { exerciseReservationAttention } from "./support/reservation-attention";

async function switchBusiness(page: Page, name: string) {
  await page
    .getByRole("combobox", { name: "Switch business", exact: true })
    .click();
  await page.getByRole("option", { name, exact: true }).click();
}

async function invitationLink(email: string, after: number, baseURL: string) {
  let link = "";
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
        expect(response.ok).toBe(true);
        const { messages } = (await response.json()) as {
          messages: Array<{ html: string }>;
        };
        link =
          messages
            .map(
              (message) =>
                message.html.match(/href="([^"]*\/invites\/[^"?#]+)"/)?.[1],
            )
            .find(Boolean)
            ?.replaceAll("&amp;", "&") ?? "";
        return Boolean(link);
      },
      {
        timeout: 30_000,
        message: "The actual venue invitation must reach the localhost mailbox",
      },
    )
    .toBe(true);
  // Use the delivered invitation, and never navigate away from the disposable app.
  expect(new URL(link).origin).toBe(new URL(baseURL).origin);
  return link;
}

test("beauty owner creates a separate café, switches workspaces and invites a host with restricted setup access", async ({
  page: owner,
  context,
  browser,
  baseURL,
}) => {
  test.setTimeout(360_000);
  const suffix = Date.now().toString(36);
  const studioName = `E2E Access Beauty ${suffix}`;
  const studioSlug = `e2e-access-beauty-${suffix}`;
  const venueName = `E2E Access Cafe ${suffix}`;
  const venueSlug = `e2e-access-cafe-${suffix}`;
  const hostName = "Access Journey Host";
  const hostEmail = `hospitality-host-${suffix}@example.test`;
  const tableName = "Host Visible Table";
  const tableLabels = [tableName, "Host Table B", "Host Table C"] as const;
  const errors: string[] = [];
  owner.on("pageerror", (error) => errors.push(error.message));
  await prepareContext(context, baseURL!);

  await test.step("A verified beauty owner opens a separate café dashboard using only a name and explicit type", async () => {
    await launchStudio(
      owner,
      studioName,
      `business-owner-${suffix}@example.test`,
    );
    const original = await studioSnapshot(studioSlug);
    expect(original.org.industry).toBe("beauty_wellness");
    expect(original.org.websiteStatus).toBe("published");
    await owner.goto("/onboarding");
    await expect(owner).toHaveURL(/\/beauty(?:\?|$)/);
    await expect(owner.getByTestId("choose-hospitality")).toHaveCount(0);
    await owner.goto("/hospitality/setup");
    await owner.getByLabel("Venue name", { exact: true }).fill(venueName);
    await owner.getByRole("button", { name: "Next", exact: true }).click();
    await owner.getByRole("radio", { name: "Café", exact: true }).click();
    await owner
      .getByRole("button", { name: "Open dashboard", exact: true })
      .click();
    await expect(owner).toHaveURL(/\/hospitality$/);
    await expect(
      owner.getByRole("heading", { name: "Reservations", exact: true }),
    ).toBeVisible();
    await expect(owner.getByTestId("venue-setup-guide")).toBeVisible();
    await assertHospitalityNavigation(owner, "Reservations");
    await expect(
      owner.getByRole("button", { name: "Add reservation", exact: true }),
    ).toBeDisabled();
    const venue = await studioSnapshot(venueSlug);
    expect(venue.org._id).not.toBe(original.org._id);
    expect(venue.org.industry).toBe("hospitality");
    expect(venue.org.venueType).toBe("cafe");
    expect(venue.org.websiteStatus).toBe("unpublished");
    expect(venue.org.address).toBeUndefined();
    expect((await context.request.get(`/reserve/${venueSlug}`)).status()).toBe(
      404,
    );
    expect(venue.services).toHaveLength(0);
    expect(venue.staff).toHaveLength(1);
    expect(venue.staff[0].userId).toBe(original.staff[0].userId);
    expect((await studioSnapshot(studioSlug)).org).toEqual(original.org);
    await owner.goto("/upgrade");
    await expect(owner).toHaveURL(/\/hospitality$/);
    await expect(
      owner.getByRole("heading", { name: "Reservations", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  await test.step("The shared switcher safely opens both actual workspaces", async () => {
    await switchBusiness(owner, studioName);
    await expect(owner).toHaveURL(/\/beauty(?:\?|$)/);
    await expect(
      owner.getByRole("combobox", { name: "Switch business", exact: true }),
    ).toContainText(studioName);
    await expect(
      owner.getByRole("link", { name: "Venue setup", exact: true }),
    ).toHaveCount(0);
    await switchBusiness(owner, venueName);
    await expect(owner).toHaveURL(/\/hospitality$/);
    await expect(
      owner.getByRole("heading", { name: "Reservations", exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByRole("combobox", { name: "Switch business", exact: true }),
    ).toContainText(venueName);
    expect(errors).toEqual([]);
  });

  await test.step("The owner manages café tables through the separate Tables destination", async () => {
    await owner
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link", { name: "Tables", exact: true })
      .click();
    await expect(owner).toHaveURL(/\/hospitality\/tables$/);
    await expect(
      owner.getByRole("heading", { name: "Tables", exact: true }),
    ).toBeVisible();
    await assertHospitalityNavigation(owner, "Tables");
    await owner
      .getByRole("link", { name: "Manage tables", exact: true })
      .click();
    for (const label of tableLabels) {
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
    for (const [name, labels] of [
      ["Host A + B", tableLabels.slice(0, 2)],
      ["Host B + C", tableLabels.slice(1)],
    ] as const) {
      await owner
        .getByRole("button", { name: "Add combination", exact: true })
        .click();
      const dialog = owner.getByRole("dialog", {
        name: "Add combination",
        exact: true,
      });
      await dialog.getByLabel("Name", { exact: true }).fill(name);
      await dialog.getByLabel("Capacity", { exact: true }).fill("4");
      await dialog.getByLabel("Minimum party size", { exact: true }).fill("3");
      for (const label of labels)
        await dialog.getByLabel(`${label} · 2 guests`, { exact: true }).check();
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await expect(dialog).not.toBeVisible();
    }
    await owner.getByRole("tab", { name: "Overview", exact: true }).click();
    await expect(
      owner.getByRole("article", { name: tableName, exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByRole("combobox", { name: "Switch business", exact: true }),
    ).toContainText(venueName);
    await captureHospitalityWorkspace(owner, "cafe-owner-tables", "Tables");
  });

  let inviteURL = "";
  await test.step("The café owner sends an actual host invitation", async () => {
    await owner.getByRole("link", { name: "Venue setup", exact: true }).click();
    await owner
      .getByRole("tab", { name: "Hours & rules", exact: true })
      .click();
    await owner
      .getByLabel("Dining duration (minutes)", { exact: true })
      .fill("30");
    await owner
      .getByLabel("Table reset buffer (minutes)", { exact: true })
      .fill("0");
    await owner
      .getByRole("button", { name: "Add service period", exact: true })
      .click();
    const boundary = servicePeriodBoundary();
    await owner
      .getByLabel("Period 1 name", { exact: true })
      .fill("Daily service");
    await owner.getByLabel("Period 1 opens", { exact: true }).fill(boundary);
    await owner.getByLabel("Period 1 closes", { exact: true }).fill(boundary);
    await owner.getByLabel("Closes the next day", { exact: true }).check();
    await owner
      .getByRole("button", { name: "Save reservation rules", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await floorServiceSnapshot(venueSlug)).settings.servicePeriods
            ?.length,
      )
      .toBe(1);
    // Operational staff access does not publish the venue or invent missing profile details.
    expect((await floorServiceSnapshot(venueSlug)).org.websiteStatus).toBe(
      "unpublished",
    );
    await owner.getByRole("tab", { name: "Team", exact: true }).click();
    await owner.getByLabel("Team member name", { exact: true }).fill(hostName);
    await owner.getByLabel("Sign-in email", { exact: true }).fill(hostEmail);
    await expect(
      owner.getByRole("combobox", { name: "Access", exact: true }),
    ).toContainText("Host — daily reservations");
    const after = Date.now();
    await owner
      .getByRole("button", { name: "Send invitation", exact: true })
      .click();
    await expect(
      owner.getByText(`Invitation pending: ${hostEmail}`, { exact: false }),
    ).toBeVisible();
    inviteURL = await invitationLink(hostEmail, after, baseURL!);
    const venue = await studioSnapshot(venueSlug);
    expect(
      venue.staff.find((member) => member.displayName === hostName),
    ).toMatchObject({ role: "staff", isActive: true });
    expect(
      venue.staff.find((member) => member.displayName === hostName)?.userId,
    ).toBeUndefined();
  });

  const hostContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    locale: "en-GB",
    timezoneId: "Europe/Skopje",
  });
  try {
    await prepareContext(hostContext, baseURL!);
    const host = await hostContext.newPage();
    host.on("pageerror", (error) => errors.push(error.message));
    await test.step("The host follows the delivered link, signs in with real OTP, and accepts", async () => {
      await host.goto(inviteURL);
      await expect(
        host.getByText("Join your venue team", { exact: true }),
      ).toBeVisible();
      await host
        .getByRole("link", { name: "Sign in to accept", exact: true })
        .click();
      await signIn(host, hostEmail);
      await expect(host).toHaveURL(/\/invites\//);
      await host
        .getByRole("button", { name: "Accept invitation", exact: true })
        .click();
      await expect(host).toHaveURL(/\/hospitality$/);
      await expect(
        host.getByRole("heading", {
          name: "Reservations",
          exact: true,
        }),
      ).toBeVisible();
      const venue = await studioSnapshot(venueSlug);
      const member = venue.staff.find(
        (person) => person.displayName === hostName,
      );
      expect(member?.userId).toBeTruthy();
      expect(member?.role).toBe("staff");
      expect(member?.orgId).toBe(venue.org._id);
    });
    await test.step("Host navigation includes read-only tables while setup and management controls stay restricted", async () => {
      await assertHospitalityNavigation(host, "Reservations", "staff");
      await expect(
        host.getByRole("link", { name: "Venue setup", exact: true }),
      ).toHaveCount(0);
      await expect(
        host.getByRole("button", { name: "Add reservation", exact: true }),
      ).toBeVisible();
      await host
        .getByRole("navigation", { name: "Main navigation", exact: true })
        .getByRole("link", { name: "Tables", exact: true })
        .click();
      await expect(host).toHaveURL(/\/hospitality\/tables$/);
      await expect(
        host.getByRole("heading", { name: "Tables", exact: true }),
      ).toBeVisible();
      await expect(
        host.getByRole("article", { name: tableName, exact: true }),
      ).toBeVisible();
      await expect(
        host.getByRole("link", { name: "Manage tables", exact: true }),
      ).toHaveCount(0);
      for (const name of ["Add table", "Add area", "Add combination"])
        await expect(
          host.getByRole("button", { name, exact: true }),
        ).toHaveCount(0);
      await expect(host.getByRole("tab")).toHaveCount(0);
      await captureHospitalityWorkspace(
        host,
        "host-readonly-tables",
        "Tables",
        "staff",
      );
      await host.goto("/hospitality/tables?tab=tables");
      await expect(
        host.getByRole("article", { name: tableName, exact: true }),
      ).toBeVisible();
      await expect(
        host.getByRole("button", { name: "Add table", exact: true }),
      ).toHaveCount(0);
      await expect(host.getByRole("tab")).toHaveCount(0);
      await host.goto("/hospitality/setup");
      await expect(
        host.getByText("Venue setup is managed by an owner or manager.", {
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        host.getByRole("tab", { name: "Team", exact: true }),
      ).toHaveCount(0);
      await expect(
        host.getByRole("button", {
          name: "Publish venue website",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        host.getByRole("button", { name: "Save venue details", exact: true }),
      ).toHaveCount(0);
      await host
        .getByRole("navigation", { name: "Main navigation", exact: true })
        .getByRole("link", { name: "Reservations", exact: true })
        .click();
      await expect(
        host.getByRole("heading", {
          name: "Reservations",
          exact: true,
        }),
      ).toBeVisible();
      await assertHospitalityNavigation(host, "Reservations", "staff");
      expect(errors).toEqual([]);
    });
    await test.step("The host seats and manages a combined-table walk-in on the live floor without layout permissions", async () => {
      await exerciseLiveFloorService(host, {
        slug: venueSlug,
        tableLabels,
        combinationLabels: ["Host A + B", "Host B + C"],
        guestName: "Host Floor Guest",
        role: "staff",
        observer: owner,
      });
      const venue = await floorServiceSnapshot(venueSlug);
      expect(venue.org.websiteStatus).toBe("unpublished");
      expect(venue.org.address).toBeUndefined();
      expect(venue.allocations.filter((row) => row.isActive)).toHaveLength(0);
      await host.goto("/hospitality");
      await assertHospitalityNavigation(host, "Reservations", "staff");
      expect(errors).toEqual([]);
    });
    await test.step("The host edits guest details and party size with explicit table choices, conflict protection and stale-draft recovery", async () => {
      await exerciseStaffReservationAmendments(
        host,
        owner,
        venueSlug,
        tableLabels,
        "Host A + B",
      );
      await host.goto("/hospitality");
      await assertHospitalityNavigation(host, "Reservations", "staff");
      expect(errors).toEqual([]);
    });
    await test.step("The host searches guests and phone numbers, filters live visit stages and follows a hidden visit link", async () => {
      await exerciseReservationSearch(host, venueSlug, tableLabels);
      await host.goto("/hospitality");
      await assertHospitalityNavigation(host, "Reservations", "staff");
      expect(errors).toEqual([]);
    });
    await test.step("The host identifies late, ending and overdue visits and safely resets cleaning tables using server time", async () => {
      await exerciseReservationAttention(host, venueSlug, tableLabels);
      await host.goto("/hospitality");
      await assertHospitalityNavigation(host, "Reservations", "staff");
      expect(errors).toEqual([]);
    });
    await test.step("Language choices and sign out live in the shared account menu", async () => {
      await host.setViewportSize({ width: 320, height: 844 });
      await host
        .getByRole("button", { name: "Open account menu", exact: true })
        .click();
      for (const language of ["English", "Македонски", "Shqip"])
        await expect(
          host.getByRole("menuitemradio", { name: language, exact: true }),
        ).toBeVisible();
      await expect(
        host.getByRole("menuitemradio", { name: "English", exact: true }),
      ).toBeChecked();
      for (const language of [
        {
          label: "Македонски",
          navigation: "Главна навигација",
          accountMenu: "Отвори мени за сметката",
          reservations: "Резервации",
          tables: "Маси",
          code: "mk",
        },
        {
          label: "Shqip",
          navigation: "Navigimi kryesor",
          accountMenu: "Hap menynë e llogarisë",
          reservations: "Rezervimet",
          tables: "Tavolinat",
          code: "sq",
        },
      ]) {
        await host
          .getByRole("menuitemradio", { name: language.label, exact: true })
          .click();
        const navigation = host.getByRole("navigation", {
          name: language.navigation,
          exact: true,
        });
        await expect(navigation.getByRole("link")).toHaveCount(2);
        await expect(
          navigation.getByRole("link", {
            name: language.reservations,
            exact: true,
          }),
        ).toHaveAttribute("aria-current", "page");
        await expect(
          navigation.getByRole("link", { name: language.tables, exact: true }),
        ).toBeVisible();
        expect(
          await host.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await host.mouse.move(0, 0);
        await host.screenshot({
          path: test
            .info()
            .outputPath(`host-navigation-${language.code}-320.png`),
          fullPage: true,
          animations: "disabled",
          style: "nextjs-portal { visibility: hidden; }",
        });
        await host
          .getByRole("button", { name: language.accountMenu, exact: true })
          .click();
      }
      await host
        .getByRole("menuitemradio", { name: "English", exact: true })
        .click();
      await assertHospitalityNavigation(host, "Reservations", "staff");
      await host
        .getByRole("button", { name: "Open account menu", exact: true })
        .click();
      await host
        .getByRole("menuitem", { name: "Sign out", exact: true })
        .click();
      await expect(host).toHaveURL(/\/login(?:\?|$)/);
      await expect(host.locator("#auth-email")).toBeVisible();
      expect(errors).toEqual([]);
    });
  } finally {
    await hostContext.close();
  }
});
