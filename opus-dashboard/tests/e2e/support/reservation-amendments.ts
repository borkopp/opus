import { expect, test, type Locator, type Page } from "@playwright/test";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import {
  floorServiceSnapshot,
  type FloorServiceSnapshot,
} from "./floor-plan-service";

type AmendmentSnapshot = FloorServiceSnapshot & {
  customers: Doc<"customers">[];
  auditLog: Doc<"audit_log">[];
};

async function snapshot(slug: string): Promise<AmendmentSnapshot> {
  // The existing tenant-scoped fixture includes these additional read-only rows.
  return (await floorServiceSnapshot(slug)) as AmendmentSnapshot;
}

function visit(snapshot: AmendmentSnapshot, id: Id<"reservations">) {
  const reservation = snapshot.reservations.find((row) => row._id === id);
  expect(reservation).toBeTruthy();
  return reservation!;
}

function identity(reservation: Doc<"reservations">) {
  return {
    _id: reservation._id,
    orgId: reservation.orgId,
    customerId: reservation.customerId,
    opusUserId: reservation.opusUserId,
    verifiedEmail: reservation.verifiedEmail,
    manageTokenExpiresAt: reservation.manageTokenExpiresAt,
    startAt: reservation.startAt,
    endAt: reservation.endAt,
    serviceDate: reservation.serviceDate,
    arrivedAt: reservation.arrivedAt,
    seatedAt: reservation.seatedAt,
    source: reservation.source,
  };
}

async function openAmendment(page: Page, id: Id<"reservations">) {
  const row = page.locator(`#reservation-${id}`);
  await row.getByRole("button", { name: /^Reservation actions for / }).click();
  await page
    .getByRole("menuitem", { name: "Edit guest & party", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Edit guest & party",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function saveAmendment(dialog: Locator) {
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}

async function selectAssignment(page: Page, dialog: Locator, name: string) {
  await dialog
    .getByRole("combobox", { name: "Table assignment", exact: true })
    .click();
  await page.getByRole("option", { name, exact: true }).click();
}

/** Changing a visit's contact details must not transfer the verified guest's identity. */
export async function exerciseVerifiedGuestAmendment(
  owner: Page,
  client: Page,
  slug: string,
  reservationId: Id<"reservations">,
  proofGuest: Page,
  originalManageUrl: string,
) {
  const before = await snapshot(slug);
  const original = visit(before, reservationId);
  expect(original.verifiedEmail).toBeTruthy();
  expect(original.opusUserId).toBeTruthy();
  expect(original.partySize).toBe(4);
  const customer = before.customers.find(
    (row) => row._id === original.customerId,
  );
  await owner.goto(`/hospitality?date=${original.serviceDate}`);
  const dialog = await openAmendment(owner, reservationId);
  await dialog
    .getByLabel("Guest name", { exact: true })
    .fill("Updated Restaurant Guest");
  await dialog
    .getByLabel("Phone (optional)", { exact: true })
    .fill("+38970123456");
  await dialog
    .getByLabel("Email (optional)", { exact: true })
    .fill("visit-contact@example.test");
  await dialog
    .getByLabel("Special requests (optional)", { exact: true })
    .fill("Window table, one guest uses a wheelchair.");
  await dialog.getByLabel("Party size", { exact: true }).fill("3");
  // The existing configured combination still fits; no table move is needed.
  await expect(
    dialog.getByRole("combobox", { name: "Table assignment", exact: true }),
  ).toContainText("A + B");
  await saveAmendment(dialog);
  const after = await snapshot(slug);
  const amended = visit(after, reservationId);
  expect(amended).toMatchObject({
    guestName: "Updated Restaurant Guest",
    guestContact: {
      email: "visit-contact@example.test",
      phone: "+38970123456",
    },
    specialRequests: "Window table, one guest uses a wheelchair.",
    partySize: 3,
    revision: original.revision! + 1,
  });
  expect(identity(amended)).toEqual(identity(original));
  expect(amended.tableIds).toEqual(original.tableIds);
  expect(amended.combinationId).toBe(original.combinationId);
  expect(
    after.customers.find((row) => row._id === original.customerId),
  ).toEqual(customer);
  expect(after.tables).toEqual(before.tables);
  expect(
    after.auditLog.filter(
      (row) =>
        row.resourceId === reservationId &&
        row.action === "reservation.amended",
    ),
  ).toHaveLength(1);
  expect(
    after.allocations
      .filter((row) => row.isActive && row.reservationId === reservationId)
      .map((row) => row.tableId)
      .sort(),
  ).toEqual([...original.tableIds!].sort());
  const row = owner.locator(`#reservation-${reservationId}`);
  await expect(row).toContainText("Updated Restaurant Guest");
  await expect(row).toContainText("3 guests");
  await expect(row).toContainText("+38970123456");
  await expect(row).toContainText("Window table, one guest uses a wheelchair.");
  // Reload the already proven guest link. The caller also manages/cancels via
  // the original account after this helper, exercising proof and account access.
  await client.reload();
  await expect(
    client.getByText("Your reservation", { exact: true }),
  ).toBeVisible();
  await expect(
    client.getByText("Window table, one guest uses a wheelchair.", {
      exact: true,
    }),
  ).toBeVisible();
  // This other guest has never signed in. The original delivered proof still
  // grants access, independently of the linked client's authenticated session.
  await proofGuest.goto(originalManageUrl);
  await expect(
    proofGuest.getByText("Your reservation", { exact: true }),
  ).toBeVisible();
  await expect(
    proofGuest.getByText("Window table, one guest uses a wheelchair.", {
      exact: true,
    }),
  ).toBeVisible();
}

async function selectTable(page: Page, table: Doc<"tables">) {
  await page.getByTestId(`service-table-${table._id}`).click();
  const panel = page.getByTestId("floor-plan-service-panel");
  await expect(panel).toHaveAttribute(
    "aria-label",
    `Service at ${table.label}`,
  );
  return panel;
}

async function seatPair(
  page: Page,
  slug: string,
  table: Doc<"tables">,
  guestName: string,
) {
  await page.goto("/hospitality/tables/floor-plan");
  const panel = await selectTable(page, table);
  await panel
    .getByRole("button", { name: "Seat a walk-in", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Seat a walk-in",
    exact: true,
  });
  await dialog.getByLabel("Party size", { exact: true }).fill("2");
  await dialog
    .getByLabel("Dining duration (minutes)", { exact: true })
    .fill("30");
  await dialog
    .getByLabel("Guest name (optional)", { exact: true })
    .fill(guestName);
  await dialog
    .getByRole("button", { name: "Seat guests now", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const reservation = (await snapshot(slug)).reservations.find(
    (row) => row.guestName === guestName,
  )!;
  expect(reservation.tableIds).toEqual([table._id]);
  expect(reservation.status).toBe("seated");
  return reservation;
}

async function finishAndRelease(page: Page, tables: Doc<"tables">[]) {
  await page.goto("/hospitality/tables/floor-plan");
  const panel = await selectTable(page, tables[0]);
  await panel
    .getByRole("button", { name: "Finish visit", exact: true })
    .click();
  for (const table of tables) {
    const current = await selectTable(page, table);
    await current
      .getByRole("button", { name: `Mark ${table.label} ready`, exact: true })
      .click();
    await expect(
      current.getByRole("button", {
        name: `Mark ${table.label} ready`,
        exact: true,
      }),
    ).toHaveCount(0);
  }
}

async function captureAmendment(page: Page) {
  const original = page.viewportSize()!;
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`staff-reservation-amendment-${width}.png`),
      fullPage: true,
      animations: "disabled",
      style: "nextjs-portal { visibility: hidden; }",
    });
  }
  await page.setViewportSize(original);
}

/** Real staff mutations from the floor and daily list, including concurrency. */
export async function exerciseStaffReservationAmendments(
  staff: Page,
  owner: Page,
  slug: string,
  tableLabels: readonly [string, string, string],
  combinationLabel: string,
) {
  const initial = await snapshot(slug);
  const [tableA, tableB] = tableLabels.map(
    (label) => initial.tables.find((table) => table.label === label)!,
  );
  const original = await seatPair(staff, slug, tableA, "Host Amendment Guest");
  const blocker = await seatPair(owner, slug, tableB, "Party Capacity Blocker");
  const blockedBefore = await snapshot(slug);
  let dialog = await openAmendment(staff, original._id);
  await dialog.getByLabel("Party size", { exact: true }).fill("4");
  await dialog
    .getByLabel("Special requests (optional)", { exact: true })
    .fill("This blocked edit must not be saved.");
  await expect(
    dialog.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await expect(
    dialog.getByText(
      "No suitable tables are available for this party at the reservation time.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    dialog.getByRole("combobox", { name: "Table assignment", exact: true }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Keep reservation", exact: true })
    .click();
  const blockedAfter = await snapshot(slug);
  expect(visit(blockedAfter, original._id)).toEqual(
    visit(blockedBefore, original._id),
  );
  expect(blockedAfter.allocations).toEqual(blockedBefore.allocations);

  await finishAndRelease(owner, [tableB]);
  expect(visit(await snapshot(slug), blocker._id).status).toBe("completed");
  dialog = await openAmendment(staff, original._id);
  await dialog.getByLabel("Party size", { exact: true }).fill("4");
  await expect(
    dialog.getByRole("combobox", { name: "Table assignment", exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await selectAssignment(staff, dialog, combinationLabel);
  await dialog
    .getByLabel("Guest name", { exact: true })
    .fill("Host Updated Guest");
  await dialog
    .getByLabel("Phone (optional)", { exact: true })
    .fill("+38970222333");
  await dialog
    .getByLabel("Email (optional)", { exact: true })
    .fill("host-visit@example.test");
  await dialog
    .getByLabel("Special requests (optional)", { exact: true })
    .fill("Two more guests joined; one high chair.");
  await captureAmendment(staff);
  await saveAmendment(dialog);
  const changed = await snapshot(slug);
  const expanded = visit(changed, original._id);
  expect(expanded).toMatchObject({
    guestName: "Host Updated Guest",
    guestContact: { email: "host-visit@example.test", phone: "+38970222333" },
    partySize: 4,
    specialRequests: "Two more guests joined; one high chair.",
    status: "seated",
    revision: original.revision! + 1,
  });
  expect(identity(expanded)).toEqual(identity(original));
  expect([...expanded.tableIds!].sort()).toEqual(
    [tableA._id, tableB._id].sort(),
  );
  expect(changed.customers).toEqual(blockedBefore.customers);
  for (const table of [tableA, tableB]) {
    await expect(staff.getByTestId(`service-table-${table._id}`)).toContainText(
      "Host Updated Guest",
    );
  }
  await expect(staff.locator(`#reservation-${original._id}`)).toContainText(
    "4 guests",
  );

  // The staff draft retains its original revision while another staff member
  // updates the daily list. Saving the draft must not overwrite that newer visit.
  dialog = await openAmendment(staff, original._id);
  await dialog
    .getByLabel("Special requests (optional)", { exact: true })
    .fill("Stale request, do not overwrite.");
  await owner.goto(`/hospitality?date=${original.serviceDate}`);
  const otherDialog = await openAmendment(owner, original._id);
  await otherDialog
    .getByLabel("Phone (optional)", { exact: true })
    .fill("+38970111999");
  await otherDialog
    .getByLabel("Special requests (optional)", { exact: true })
    .fill("Latest guest request from the reservations list.");
  await saveAmendment(otherDialog);
  await expect(
    dialog.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await expect(dialog.getByText(/reservation changed/i)).toBeVisible();
  expect(visit(await snapshot(slug), original._id).specialRequests).toBe(
    "Latest guest request from the reservations list.",
  );
  await dialog
    .getByRole("button", { name: "Reload latest details", exact: true })
    .click();
  await expect(
    dialog.getByLabel("Special requests (optional)", { exact: true }),
  ).toHaveValue("Latest guest request from the reservations list.");
  await expect(
    dialog.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Keep reservation", exact: true })
    .click();

  // Clearing optional values is explicit and stays local to this reservation.
  await staff.goto(`/hospitality?date=${original.serviceDate}`);
  dialog = await openAmendment(staff, original._id);
  await expect(
    dialog.getByLabel("Phone (optional)", { exact: true }),
  ).toHaveValue("+38970111999");
  for (const label of [
    "Phone (optional)",
    "Email (optional)",
    "Special requests (optional)",
  ])
    await dialog.getByLabel(label, { exact: true }).fill("");
  await dialog.getByLabel("Party size", { exact: true }).fill("3");
  await expect(
    dialog.getByRole("combobox", { name: "Table assignment", exact: true }),
  ).toContainText(combinationLabel);
  await saveAmendment(dialog);
  const cleared = visit(await snapshot(slug), original._id);
  expect(cleared.guestContact).toEqual({});
  expect(cleared.specialRequests).toBeUndefined();
  expect(cleared.partySize).toBe(3);
  expect(cleared.tableIds).toEqual(expanded.tableIds);
  expect(identity(cleared)).toEqual(identity(original));
  await expect(staff.locator(`#reservation-${original._id}`)).toContainText(
    "No contact details",
  );
  await finishAndRelease(staff, [tableA, tableB]);
  const final = await snapshot(slug);
  expect(final.allocations.filter((row) => row.isActive)).toHaveLength(0);
  expect(visit(final, original._id).status).toBe("completed");
  await staff.goto(`/hospitality?date=${original.serviceDate}`);
  await expect(
    staff
      .locator(`#reservation-${original._id}`)
      .getByRole("button", { name: /^Reservation actions for / }),
  ).toHaveCount(0);
}
