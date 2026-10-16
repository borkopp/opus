import { expect, test, type Page } from "@playwright/test";
import type { Doc } from "../../../convex/_generated/dataModel";
import { addServiceDays, localDate } from "../../../convex/lib/reservationTime";
import { requiredEnv } from "./journey";
import { assertHospitalityNavigation } from "./hospitality-navigation";

export type FloorServiceSnapshot = {
  org: Doc<"orgs">;
  settings: Doc<"reservation_settings">;
  tables: Doc<"tables">[];
  combinations: Doc<"table_combinations">[];
  reservations: Doc<"reservations">[];
  allocations: Doc<"reservation_allocations">[];
};

/** Read-only evidence from the scoped fixture installed only in the disposable backend. */
export async function floorServiceSnapshot(
  slug: string,
): Promise<FloorServiceSnapshot> {
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
        args: { slug },
        format: "json",
      }),
    },
  );
  expect(response.ok).toBe(true);
  const result = await response.json();
  expect(result.status).toBe("success");
  return result.value;
}

/** Keep real server time comfortably inside a daily 24-hour test service. */
export function servicePeriodBoundary(timezone = "Europe/Skopje") {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(Date.now() - 12 * 60 * 60_000);
}

async function captureLiveFloor(
  page: Page,
  stage: string,
  role: "owner" | "staff",
) {
  const initialViewport = page.viewportSize()!;
  await page.mouse.move(0, 0);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, {
    timeout: 10_000,
  });
  for (const viewport of [
    { width: 1280, height: 900, label: "desktop" },
    { width: 390, height: 844, label: "390" },
    { width: 320, height: 844, label: "320" },
  ]) {
    await page.setViewportSize(viewport);
    await assertHospitalityNavigation(page, "Tables", role);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
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

async function selectOption(page: Page, label: string, name: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name, exact: true }).click();
}

async function selectLiveTable(page: Page, table: Doc<"tables">) {
  await page.getByTestId(`service-table-${table._id}`).click();
  const panel = page.getByTestId("floor-plan-service-panel");
  await expect(panel).toHaveAttribute(
    "aria-label",
    `Service at ${table.label}`,
  );
  return panel;
}

async function openVisitAction(page: Page, guestName: string, action: string) {
  await page
    .getByTestId("floor-plan-service-panel")
    .getByRole("button", {
      name: `Reservation actions for ${guestName}`,
      exact: true,
    })
    .click();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
}

function currentTestServiceDate(settings: Doc<"reservation_settings">) {
  // These journeys explicitly configure one daily 24-hour period. Use its saved
  // boundary so tests also work when the current service began yesterday.
  const period = settings.servicePeriods![0];
  expect(settings.servicePeriods).toHaveLength(1);
  expect(period.endDayOffset).toBe(1);
  expect(period.endTime).toBe(period.startTime);
  const timezone = settings.timezone!;
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(Date.now());
  const today = localDate(Date.now(), timezone);
  return clock < period.startTime ? addServiceDays(today, -1) : today;
}

async function createUpcomingReservation(
  page: Page,
  snapshot: FloorServiceSnapshot,
  table: Doc<"tables">,
) {
  await page.goto(
    `/hospitality?date=${currentTestServiceDate(snapshot.settings)}`,
  );
  await page
    .getByRole("button", { name: "Add reservation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Add reservation",
    exact: true,
  });
  await dialog.getByLabel("Party size", { exact: true }).fill("2");
  await dialog
    .getByLabel("Dining duration (minutes)", { exact: true })
    .fill("30");
  await dialog
    .getByLabel("Guest name", { exact: true })
    .fill("Upcoming Floor Guest");
  await page
    .getByRole("combobox", { name: "Arrival time", exact: true })
    .click();
  // The second offered future start is at most two configured intervals away.
  await page.getByRole("option").nth(1).click();
  await selectOption(page, "Table assignment (optional)", table.label);
  await dialog
    .getByRole("button", { name: "Create reservation", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

/** Exercise actual staff service, never mocked mutations or client clock overrides. */
export async function exerciseLiveFloorService(
  page: Page,
  {
    slug,
    tableLabels,
    combinationLabels,
    guestName,
    role = "owner",
    observer: suppliedObserver,
    checkUpcoming = false,
  }: {
    slug: string;
    tableLabels: readonly [string, string, string];
    combinationLabels: readonly [string, string];
    guestName: string;
    role?: "owner" | "staff";
    observer?: Page;
    checkUpcoming?: boolean;
  },
) {
  const initial = await floorServiceSnapshot(slug);
  const tables = tableLabels.map(
    (label) => initial.tables.find((table) => table.label === label)!,
  );
  for (const table of tables) expect(table).toBeTruthy();
  const [tableA, tableB, tableC] = tables;
  const observer = suppliedObserver ?? (await page.context().newPage());
  try {
    if (checkUpcoming)
      await createUpcomingReservation(observer, initial, tableB);
    await page.goto("/hospitality/tables/floor-plan");
    await expect(page.getByTestId("floor-plan-service")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Floor plan", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save layout", exact: true }),
    ).toHaveCount(0);
    if (role === "staff") {
      await expect(
        page.getByRole("link", { name: "Edit layout", exact: true }),
      ).toHaveCount(0);
      await page.goto("/hospitality/tables/floor-plan?mode=edit");
      await expect(
        page.getByText("Floor plan editing is for managers", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Save layout", exact: true }),
      ).toHaveCount(0);
      await page.goto("/hospitality/tables/floor-plan");
    } else {
      await expect(
        page.getByRole("link", { name: "Edit layout", exact: true }),
      ).toBeVisible();
      // A graphical table click opens service, never a layout drag operation.
      await page.getByTestId(`floor-item-${tableA._id}`).click();
      await expect(
        page.getByTestId("floor-plan-service-panel"),
      ).toHaveAttribute("aria-label", `Service at ${tableA.label}`);
    }
    let panel = await selectLiveTable(page, tableA);
    if (checkUpcoming) {
      const upcoming = (await floorServiceSnapshot(slug)).reservations.find(
        (row) => row.guestName === "Upcoming Floor Guest",
      )!;
      expect(upcoming.startAt).toBeGreaterThan(Date.now());
      expect(upcoming.startAt - Date.now()).toBeLessThan(31 * 60_000);
      await panel
        .getByRole("button", { name: "Seat a walk-in", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Seat a walk-in",
        exact: true,
      });
      await dialog.getByLabel("Party size", { exact: true }).fill("4");
      await dialog
        .getByLabel("Dining duration (minutes)", { exact: true })
        .fill("60");
      await expect(
        dialog.getByRole("button", { name: "Seat guests now", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog.getByText("No suitable tables are available for this walk-in.", {
          exact: true,
        }),
      ).toBeVisible();
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
      await selectLiveTable(page, tableB);
      await expect(
        page
          .getByTestId("floor-plan-service-panel")
          .getByText("Upcoming Floor Guest", { exact: true }),
      ).toBeVisible();
      await openVisitAction(page, "Upcoming Floor Guest", "Cancel");
      await page
        .getByRole("dialog", { name: "Cancel reservation", exact: true })
        .getByRole("button", { name: "Confirm cancellation", exact: true })
        .click();
      await expect
        .poll(
          async () =>
            (await floorServiceSnapshot(slug)).reservations.find(
              (row) => row._id === upcoming._id,
            )?.status,
        )
        .toBe("cancelled");
      panel = await selectLiveTable(page, tableA);
    }
    await observer.goto("/hospitality/tables/floor-plan");
    await selectLiveTable(observer, tableB);
    await panel
      .getByRole("button", { name: "Seat a walk-in", exact: true })
      .click();
    const dialog = page.getByRole("dialog", {
      name: "Seat a walk-in",
      exact: true,
    });
    await dialog.getByLabel("Party size", { exact: true }).fill("4");
    await dialog
      .getByLabel("Dining duration (minutes)", { exact: true })
      .fill("15");
    await dialog
      .getByLabel("Guest name (optional)", { exact: true })
      .fill(guestName);
    // Only the configured A+B combination containing the selected table is valid.
    const choice = dialog.getByRole("radio");
    await expect(choice).toHaveCount(1);
    await expect(choice).toBeChecked();
    await expect(choice.locator("..")).toContainText(combinationLabels[0]);
    await expect(
      dialog.getByText(combinationLabels[1], { exact: true }),
    ).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    panel = await selectLiveTable(page, tableB);
    await panel
      .getByRole("button", { name: "Seat a walk-in", exact: true })
      .click();
    await dialog.getByLabel("Party size", { exact: true }).fill("4");
    await dialog
      .getByLabel("Dining duration (minutes)", { exact: true })
      .fill("15");
    await dialog
      .getByLabel("Guest name (optional)", { exact: true })
      .fill(guestName);
    await expect(dialog.getByRole("radio")).toHaveCount(2);
    await expect(dialog.locator('input[type="radio"]:checked')).toHaveCount(0);
    await expect(
      dialog.getByRole("button", { name: "Seat guests now", exact: true }),
    ).toBeDisabled();
    await dialog.getByText(combinationLabels[0], { exact: true }).click();
    await expect(dialog.locator('input[type="radio"]:checked')).toHaveCount(1);
    await expect(
      dialog.getByRole("button", { name: "Seat guests now", exact: true }),
    ).toBeEnabled();
    const beforeSeat = Date.now();
    await dialog
      .getByRole("button", { name: "Seat guests now", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    panel = await selectLiveTable(page, tableA);
    await expect(panel.getByText(guestName, { exact: true })).toBeVisible();
    await expect(panel.getByText("seated", { exact: true })).toBeVisible();
    const seated = (await floorServiceSnapshot(slug)).reservations.find(
      (row) => row.guestName === guestName,
    )!;
    expect(seated).toMatchObject({
      source: "walk_in",
      status: "seated",
      revision: 1,
      partySize: 4,
      durationMins: 15,
    });
    expect(seated.startAt).toBeGreaterThanOrEqual(beforeSeat);
    expect(seated.startAt).toBeLessThanOrEqual(Date.now());
    expect(seated.seatedAt).toBe(seated.startAt);
    expect(seated.arrivedAt).toBe(seated.startAt);
    expect([...seated.tableIds!].sort()).toEqual(
      [tableA._id, tableB._id].sort(),
    );
    // A different tab/account observes the mutation without a reload or manual refresh.
    await expect(
      observer
        .getByTestId("floor-plan-service-panel")
        .getByText(guestName, { exact: true }),
    ).toBeVisible();
    for (const table of [tableA, tableB])
      await expect(
        page.getByTestId(`service-table-${table._id}`),
      ).toContainText(guestName);
    await captureLiveFloor(page, `${role}-floor-occupied`, role);

    await openVisitAction(page, guestName, "Change duration");
    const durationDialog = page.getByRole("dialog", {
      name: "Change dining duration",
      exact: true,
    });
    await durationDialog
      .getByLabel("New dining duration (minutes)", { exact: true })
      .fill("30");
    await durationDialog
      .getByRole("button", { name: "Confirm change", exact: true })
      .click();
    await expect(durationDialog).not.toBeVisible();
    await expect
      .poll(
        async () =>
          (await floorServiceSnapshot(slug)).reservations.find(
            (row) => row._id === seated._id,
          )?.durationMins,
      )
      .toBe(30);
    await openVisitAction(page, guestName, "Move table");
    await selectOption(page, "Table assignment", combinationLabels[1]);
    const moveDialog = page.getByRole("dialog", {
      name: "Move reservation",
      exact: true,
    });
    await moveDialog
      .getByRole("button", { name: "Confirm change", exact: true })
      .click();
    await expect(moveDialog).not.toBeVisible();
    await expect
      .poll(async () =>
        [
          ...((await floorServiceSnapshot(slug)).reservations.find(
            (row) => row._id === seated._id,
          )?.tableIds ?? []),
        ].sort(),
      )
      .toEqual([tableB._id, tableC._id].sort());
    await expect(
      panel.getByRole("button", {
        name: `Mark ${tableA.label} ready`,
        exact: true,
      }),
    ).toBeEnabled();
    await panel
      .getByRole("button", { name: `Mark ${tableA.label} ready`, exact: true })
      .click();
    await expect(
      panel.getByRole("button", {
        name: `Mark ${tableA.label} ready`,
        exact: true,
      }),
    ).toHaveCount(0);
    panel = await selectLiveTable(page, tableB);
    await expect(panel.getByText(guestName, { exact: true })).toBeVisible();
    await panel
      .getByRole("button", { name: "Finish visit", exact: true })
      .click();
    await expect(
      panel.getByRole("button", {
        name: `Mark ${tableB.label} ready`,
        exact: true,
      }),
    ).toBeEnabled();
    await captureLiveFloor(page, `${role}-floor-cleaning`, role);
    await panel
      .getByRole("button", { name: `Mark ${tableB.label} ready`, exact: true })
      .click();
    await expect
      .poll(async () =>
        (await floorServiceSnapshot(slug)).allocations
          .filter((row) => row.isActive && row.reservationId === seated._id)
          .map((row) => row.tableId),
      )
      .toEqual([tableC._id]);
    await expect(
      observer
        .getByTestId("floor-plan-service-panel")
        .getByText("No current or upcoming visit.", { exact: true }),
    ).toBeVisible();
    panel = await selectLiveTable(page, tableC);
    await panel
      .getByRole("button", { name: `Mark ${tableC.label} ready`, exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await floorServiceSnapshot(slug)).allocations.filter(
            (row) => row.isActive && row.reservationId === seated._id,
          ).length,
      )
      .toBe(0);
    const final = await floorServiceSnapshot(slug);
    expect(
      final.reservations.find((row) => row._id === seated._id)?.status,
    ).toBe("completed");
    expect(
      final.tables.map(({ status, updatedAt, ...table }) => {
        void status;
        void updatedAt;
        return table;
      }),
    ).toEqual(
      initial.tables.map(({ status, updatedAt, ...table }) => {
        void status;
        void updatedAt;
        return table;
      }),
    );
    expect(final.org.websiteStatus).toBe(initial.org.websiteStatus);
    return seated;
  } finally {
    if (!suppliedObserver) await observer.close();
  }
}
