import { expect, test, type Page } from "@playwright/test";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { addServiceDays, localDate } from "../../../convex/lib/reservationTime";
import { floorServiceSnapshot } from "./floor-plan-service";
import { requiredEnv } from "./journey";

function currentServiceDate(settings: Doc<"reservation_settings">) {
  const period = settings.servicePeriods![0];
  expect(settings.servicePeriods).toHaveLength(1);
  expect(period.endDayOffset).toBe(1);
  expect(period.endTime).toBe(period.startTime);
  const timezone = settings.timezone!;
  const now = Date.now();
  const clock = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const today = localDate(now, timezone);
  return clock < period.startTime ? addServiceDays(today, -1) : today;
}

async function advanceVisit(
  slug: string,
  reservationId: Id<"reservations">,
  stage:
    | "late"
    | "ending_soon"
    | "overdue"
    | "cleaning_ready"
    | "cleaning_boundary",
) {
  const response = await fetch(
    `${requiredEnv("OPUS_E2E_CONVEX_URL")}/api/mutation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Convex ${requiredEnv("OPUS_E2E_CONVEX_ADMIN_KEY")}`,
      },
      body: JSON.stringify({
        path: "e2eFixtures:advanceReservationAttention",
        args: { slug, reservationId, stage },
        format: "json",
      }),
    },
  );
  expect(response.ok).toBe(true);
  const result = await response.json();
  expect(result.status, result.errorMessage).toBe("success");
}

async function createAttentionVisit(
  page: Page,
  slug: string,
  date: string,
  table: Doc<"tables">,
  name: string,
  phone: string,
  seated: boolean,
) {
  await page.goto(`/hospitality?date=${date}`);
  await page
    .getByRole("button", { name: "Add reservation", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Add reservation",
    exact: true,
  });
  await dialog.getByLabel("Guest name", { exact: true }).fill(name);
  await dialog
    .getByLabel("Guest phone (optional)", { exact: true })
    .fill(phone);
  await dialog
    .getByRole("combobox", { name: "Arrival time", exact: true })
    .click();
  await page.getByRole("option").first().click();
  await dialog
    .getByRole("combobox", { name: "Table assignment (optional)", exact: true })
    .click();
  await page.getByRole("option", { name: table.label, exact: true }).click();
  await dialog
    .getByRole("button", { name: "Create reservation", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const reservation = (await floorServiceSnapshot(slug)).reservations.find(
    (row) => row.guestName === name,
  )!;
  expect(reservation).toBeTruthy();
  if (seated) {
    await page
      .locator(`#reservation-${reservation._id}`)
      .getByRole("button", { name: "Seat guests", exact: true })
      .click();
    await expect(
      page
        .locator(`#reservation-${reservation._id}`)
        .getByRole("button", { name: "Finish visit", exact: true }),
    ).toBeVisible();
  }
  return reservation;
}

async function selectStatus(page: Page, label: string) {
  const radio = page
    .getByRole("radiogroup", { name: "Visit status", exact: true })
    .getByRole("radio", { name: new RegExp(`^${label}(?:\\s|$)`) });
  await radio.click();
  await expect(radio).toBeChecked();
}

async function captureAttention(page: Page, stage: string) {
  const original = page.viewportSize()!;
  await page.mouse.move(0, 0);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, {
    timeout: 10_000,
  });
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Reservation attention indicators fit at ${width}px`,
    ).toBe(true);
    await page.screenshot({
      path: test
        .info()
        .outputPath(`staff-reservation-attention-${stage}-${width}.png`),
      fullPage: true,
      animations: "disabled",
      style: "nextjs-portal { visibility: hidden; }",
    });
  }
  await page.setViewportSize(original);
}

/** Only passage of time is fixture-controlled; all service actions are real. */
export async function exerciseReservationAttention(
  staff: Page,
  slug: string,
  tableLabels: readonly [string, string, string],
) {
  const initial = await floorServiceSnapshot(slug);
  expect(
    initial.allocations.filter((allocation) => allocation.isActive),
  ).toHaveLength(0);
  const date = currentServiceDate(initial.settings);
  const tables = tableLabels.map(
    (label) => initial.tables.find((table) => table.label === label)!,
  );
  const late = await createAttentionVisit(
    staff,
    slug,
    date,
    tables[0],
    "Attention Late Guest",
    "+38970555111",
    false,
  );
  const ending = await createAttentionVisit(
    staff,
    slug,
    date,
    tables[1],
    "Attention Ending Guest",
    "+38970555222",
    true,
  );
  const overdue = await createAttentionVisit(
    staff,
    slug,
    date,
    tables[2],
    "Attention Overdue Guest",
    "+38970555333",
    true,
  );
  await advanceVisit(slug, late._id, "late");
  await advanceVisit(slug, ending._id, "ending_soon");
  await advanceVisit(slug, overdue._id, "overdue");
  const lateRow = staff.locator(`#reservation-${late._id}`);
  const endingRow = staff.locator(`#reservation-${ending._id}`);
  const overdueRow = staff.locator(`#reservation-${overdue._id}`);
  const search = staff.getByRole("textbox", {
    name: "Search guests",
    exact: true,
  });
  await search.fill("Attention");
  await expect(staff.getByTestId("reservation-row")).toHaveCount(3);
  await expect(lateRow.getByText(/^Late arrival · \d+ min$/)).toBeVisible();
  await expect(endingRow.getByText(/^Ending soon · \d+ min$/)).toBeVisible();
  await expect(overdueRow.getByText(/^Overdue · \d+ min$/)).toBeVisible();

  // Staff device clocks must not decide lateness, visit deadlines or cleaning.
  await staff.clock.setFixedTime(new Date(Date.now() + 24 * 60 * 60_000));
  try {
    await staff.evaluate(() => window.dispatchEvent(new Event("focus")));
    const lateMinutes = (initial.settings.noShowGraceMins ?? 15) + 5;
    await expect(
      lateRow.getByText(
        new RegExp(
          `^Late arrival · (?:${[0, 1, 2, 3, 4].map((extra) => lateMinutes + extra).join("|")}) min$`,
        ),
      ),
    ).toBeVisible();
    await expect(
      endingRow.getByText(/^Ending soon · (?:[1-9]|10) min$/),
    ).toBeVisible();
    await expect(overdueRow.getByText(/^Overdue · [5-9] min$/)).toBeVisible();
    await expect(staff.getByLabel("Service date", { exact: true })).toHaveValue(
      date,
    );
    await captureAttention(staff, "visits");

    // Indicators remain attached to the right visit under combined filters.
    await search.fill("070 555 222");
    await selectStatus(staff, "Seated");
    await expect(staff.getByTestId("reservation-row")).toHaveCount(1);
    await expect(endingRow.getByText(/^Ending soon · \d+ min$/)).toBeVisible();
    await advanceVisit(slug, ending._id, "overdue");
    await staff.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(endingRow.getByText(/^Overdue · \d+ min$/)).toBeVisible();
    await expect(endingRow.getByText(/^Ending soon ·/)).toHaveCount(0);

    await search.fill("Attention");
    await selectStatus(staff, "All");
    await lateRow.getByRole("button", { name: "Arrived", exact: true }).click();
    await expect(lateRow.getByText(/^Late arrival ·/)).toHaveCount(0);
    await lateRow
      .getByRole("button", { name: "Seat guests", exact: true })
      .click();
    await expect(
      lateRow.getByRole("button", { name: "Finish visit", exact: true }),
    ).toBeVisible();
    await overdueRow
      .getByRole("button", { name: "Finish visit", exact: true })
      .click();
    await expect(overdueRow.getByText(/^Overdue ·/)).toHaveCount(0);
    await expect(
      overdueRow.getByText(/^Cleaning needed · 1 table/),
    ).toBeVisible();
    await expect(
      overdueRow.getByText(
        new RegExp(`${tables[2].label} · Cleaning buffer · \\d+ min`),
      ),
    ).toBeVisible();
    const reset = overdueRow.getByRole("button", {
      name: `Mark ${tables[2].label} ready`,
      exact: true,
    });
    await expect(reset).toBeDisabled();
    await captureAttention(staff, "cleaning");
    await advanceVisit(slug, overdue._id, "cleaning_boundary");
    await expect(
      overdueRow.getByText(`${tables[2].label} · Cleaning buffer · 1 min`, {
        exact: true,
      }),
    ).toBeVisible();
    await expect(reset).toBeDisabled();
    // No database writes, focus events, reloads or clock advances from here:
    // the normal 30-second refresh must notice the server deadline passing.
    await expect(reset).toBeEnabled({ timeout: 40_000 });
    await expect(
      overdueRow.getByText(`${tables[2].label} · Ready for reset`, {
        exact: true,
      }),
    ).toBeVisible();
    await reset.click();
    await expect(overdueRow.getByText(/^Cleaning needed ·/)).toHaveCount(0);
    await expect(reset).toHaveCount(0);

    // Complete the remaining visits and release their physical holds normally.
    for (const [reservation, row, table] of [
      [late, lateRow, tables[0]],
      [ending, endingRow, tables[1]],
    ] as const) {
      await row
        .getByRole("button", { name: "Finish visit", exact: true })
        .click();
      await expect(row.getByText(/^Cleaning needed · 1 table/)).toBeVisible();
      await advanceVisit(slug, reservation._id, "cleaning_ready");
      await staff.evaluate(() => window.dispatchEvent(new Event("focus")));
      const ready = row.getByRole("button", {
        name: `Mark ${table.label} ready`,
        exact: true,
      });
      await expect(ready).toBeEnabled();
      await ready.click();
      await expect(row.getByText(/^Cleaning needed ·/)).toHaveCount(0);
    }
  } finally {
    await staff.clock.setSystemTime(new Date());
  }
  const final = await floorServiceSnapshot(slug);
  expect(
    final.allocations.filter((allocation) => allocation.isActive),
  ).toHaveLength(0);
  for (const reservation of [late, ending, overdue])
    expect(
      final.reservations.find((row) => row._id === reservation._id)?.status,
    ).toBe("completed");
}
