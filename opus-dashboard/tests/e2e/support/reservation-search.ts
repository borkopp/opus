import { expect, test, type Page } from "@playwright/test";
import type { Doc } from "../../../convex/_generated/dataModel";
import { addServiceDays, localDate } from "../../../convex/lib/reservationTime";
import { floorServiceSnapshot } from "./floor-plan-service";

function serviceDate(settings: Doc<"reservation_settings">) {
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

function status(page: Page, label: string) {
  return page
    .getByRole("radiogroup", { name: "Visit status", exact: true })
    .getByRole("radio", { name: new RegExp(`^${label}(?:\\s|$)`) });
}

async function filterStatus(page: Page, label: string) {
  const filter = status(page, label);
  await filter.click();
  await expect(filter).toBeChecked();
}

async function createVisit(
  page: Page,
  slug: string,
  date: string,
  table: Doc<"tables">,
  name: string,
  phone: string,
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
  // The first available future slot remains within the staff seating window.
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
  );
  expect(reservation).toBeTruthy();
  expect(reservation!.status).toBe("confirmed");
  return reservation!;
}

async function cancelVisit(page: Page, reservation: Doc<"reservations">) {
  await page
    .locator(`#reservation-${reservation._id}`)
    .getByRole("button", { name: /^Reservation actions for / })
    .click();
  await page.getByRole("menuitem", { name: "Cancel", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Cancel reservation",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Confirm cancellation", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

async function captureSearch(page: Page) {
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
      `Reservation search and every status filter fit at ${width}px`,
    ).toBe(true);
    for (const label of [
      "All",
      "Upcoming",
      "Arrived",
      "Seated",
      "Completed",
      "Cancelled",
      "No-show",
    ])
      await expect(status(page, label)).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`staff-reservation-search-${width}.png`),
      fullPage: true,
      animations: "disabled",
      style: "nextjs-portal { visibility: hidden; }",
    });
  }
  await page.setViewportSize(original);
}

/** Actual staff mutations prove that filters follow live visit state changes. */
export async function exerciseReservationSearch(
  staff: Page,
  slug: string,
  tableLabels: readonly [string, string, string],
) {
  const initial = await floorServiceSnapshot(slug);
  const date = serviceDate(initial.settings);
  const nextDate = addServiceDays(date, 1);
  const [tableA, tableB] = tableLabels.map(
    (label) => initial.tables.find((table) => table.label === label)!,
  );
  expect(initial.allocations.filter((row) => row.isActive)).toHaveLength(0);
  const guest = await createVisit(
    staff,
    slug,
    date,
    tableA,
    "Élodie Search Guest",
    "+38970333444",
  );
  const cancelled = await createVisit(
    staff,
    slug,
    date,
    tableB,
    "Search Cancel Guest",
    "+38970444555",
  );
  const otherDay = await createVisit(
    staff,
    slug,
    nextDate,
    tableA,
    "Other Day Search Guest",
    "+38970333444",
  );
  await staff.goto(`/hospitality?date=${date}`);
  const search = staff.getByRole("textbox", {
    name: "Search guests",
    exact: true,
  });
  const rows = staff.getByTestId("reservation-row");
  const guestRow = staff.locator(`#reservation-${guest._id}`);
  const cancelledRow = staff.locator(`#reservation-${cancelled._id}`);
  const otherDayRow = staff.locator(`#reservation-${otherDay._id}`);
  const noMatches = staff.getByRole("heading", {
    name: "No matching reservations",
    exact: true,
  });
  await expect(search).toHaveAttribute("placeholder", "Name or phone number");
  await expect(status(staff, "All")).toBeChecked();

  await search.fill("ELODIE");
  await expect(rows).toHaveCount(1);
  await expect(guestRow).toBeVisible();
  await expect(status(staff, "Upcoming")).toContainText("1");
  await expect(status(staff, "Upcoming")).toHaveAccessibleDescription(
    "1 matching visits",
  );
  await expect(status(staff, "Completed")).toContainText("0");
  for (const [phone, count] of [
    ["070", 2],
    ["0038970", 2],
    ["070 333 444", 1],
    ["00389 70 333 444", 1],
    ["389 (70) 333-444", 1],
  ] as const) {
    await search.fill(phone);
    await expect(rows).toHaveCount(count);
    await expect(guestRow).toBeVisible();
    await expect(otherDayRow).toHaveCount(0);
  }
  await staff.getByLabel("Service date", { exact: true }).fill(nextDate);
  await expect(search).toHaveValue("389 (70) 333-444");
  await expect(rows).toHaveCount(1);
  await expect(otherDayRow).toBeVisible();
  await expect(guestRow).toHaveCount(0);
  await staff.getByLabel("Service date", { exact: true }).fill(date);
  await expect(guestRow).toBeVisible();
  await staff
    .getByRole("button", { name: "Clear search", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await search.fill("search");
  await expect(rows).toHaveCount(2);
  await filterStatus(staff, "Upcoming");
  await expect(rows).toHaveCount(2);
  await captureSearch(staff);

  // Changes made under an active filter remove the row and update its counts.
  await search.fill("elodie");
  const arrive = guestRow.getByRole("button", { name: "Arrived", exact: true });
  await arrive.focus();
  await arrive.press("Enter");
  await expect(guestRow).toHaveCount(0);
  await expect(noMatches).toBeVisible();
  await expect(status(staff, "Upcoming")).toContainText("0");
  await expect(status(staff, "Upcoming")).toBeFocused();
  await expect(status(staff, "Arrived")).toContainText("1");
  await filterStatus(staff, "Arrived");
  await expect(guestRow).toBeVisible();
  await guestRow
    .getByRole("button", { name: "Seat guests", exact: true })
    .click();
  await expect(guestRow).toHaveCount(0);
  await expect(status(staff, "Seated")).toContainText("1");
  await filterStatus(staff, "Seated");
  await expect(guestRow).toBeVisible();
  await guestRow
    .getByRole("button", { name: "Finish visit", exact: true })
    .click();
  await expect(guestRow).toHaveCount(0);
  await expect(status(staff, "Completed")).toContainText("1");
  await filterStatus(staff, "Completed");
  await expect(guestRow).toBeVisible();
  await guestRow
    .getByRole("button", { name: `Mark ${tableA.label} ready`, exact: true })
    .click();
  await expect(
    guestRow.getByRole("button", { name: /^Mark .* ready$/ }),
  ).toHaveCount(0);

  await staff
    .getByRole("button", { name: "Reset filters", exact: true })
    .click();
  await expect(search).toHaveValue("");
  await expect(status(staff, "All")).toBeChecked();
  await search.fill("cancel");
  await filterStatus(staff, "Upcoming");
  await cancelVisit(staff, cancelled);
  await expect(cancelledRow).toHaveCount(0);
  await expect(status(staff, "Upcoming")).toBeFocused();
  await expect(status(staff, "Cancelled")).toContainText("1");
  await filterStatus(staff, "Cancelled");
  await expect(cancelledRow).toBeVisible();
  await filterStatus(staff, "No-show");
  await expect(rows).toHaveCount(0);
  await expect(noMatches).toBeVisible();

  const privateQuery = "private-guest-search-9c439e";
  await search.fill(privateQuery);
  expect(decodeURIComponent(staff.url())).not.toContain(privateQuery);
  expect(
    await staff.evaluate(() => JSON.stringify(localStorage)),
  ).not.toContain(privateQuery);
  expect(
    await staff.evaluate(() => JSON.stringify(sessionStorage)),
  ).not.toContain(privateQuery);

  // A link from the live floor must reveal its visit even under incompatible filters.
  await staff.evaluate((id) => {
    window.location.hash = `reservation-${id}`;
  }, guest._id);
  await expect(guestRow).toBeVisible();
  await expect(guestRow).toBeFocused();
  await expect(search).toHaveValue("");
  await expect(status(staff, "All")).toBeChecked();

  // Release the next-day booking through the normal staff flow as well.
  await staff.goto(`/hospitality?date=${nextDate}`);
  await cancelVisit(staff, otherDay);
  await filterStatus(staff, "Cancelled");
  await expect(otherDayRow).toBeVisible();
  const final = await floorServiceSnapshot(slug);
  expect(final.reservations.find((row) => row._id === guest._id)?.status).toBe(
    "completed",
  );
  for (const reservation of [cancelled, otherDay])
    expect(
      final.reservations.find((row) => row._id === reservation._id)?.status,
    ).toBe("cancelled");
  expect(final.allocations.filter((row) => row.isActive)).toHaveLength(0);
}
