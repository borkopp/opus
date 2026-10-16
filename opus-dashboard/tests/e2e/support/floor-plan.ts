import { expect, test, type Page } from "@playwright/test";

/** Real editor interactions; callers separately verify operational data is unchanged. */
export async function exerciseFloorPlan(
  page: Page,
  tables: Array<{ _id: string; label: string }>,
) {
  const tableA = tables.find((table) => table.label === "A")!;
  const tableB = tables.find((table) => table.label === "B")!;
  const tableC = tables.find((table) => table.label === "C")!;
  const initialViewport = page.viewportSize()!;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/hospitality/tables/floor-plan?mode=edit");
  await expect(
    page.getByRole("heading", { name: "Floor plan", exact: true }),
  ).toBeVisible();
  const objects = page.getByLabel("Room objects", { exact: true });
  const inspector = page.getByLabel("Floor plan inspector", { exact: true });
  const canvas = page.getByRole("group", {
    name: "Floor plan canvas",
    exact: true,
  });
  const itemA = page.getByTestId(`floor-item-${tableA._id}`);
  const x = inspector.getByLabel("Position X", { exact: true });
  const y = inspector.getByLabel("Position Y", { exact: true });
  const width = inspector.getByLabel("Width", { exact: true });
  const save = page.getByRole("button", { name: "Save layout", exact: true });

  await page
    .getByRole("button", { name: "Arrange tables", exact: true })
    .click();
  await objects.getByRole("button", { name: "A", exact: true }).click();
  await expect(itemA).toHaveAttribute("aria-pressed", "true");
  const beforeDrag = await x.inputValue();
  await itemA.scrollIntoViewIfNeeded();
  const bounds = await itemA.boundingBox();
  expect(bounds).not.toBeNull();
  const center = {
    x: bounds!.x + bounds!.width / 2,
    y: bounds!.y + bounds!.height / 2,
  };
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + 55, center.y + 35, { steps: 8 });
  await page.mouse.up();
  await expect(x).not.toHaveValue(beforeDrag);
  const afterDrag = Number(await x.inputValue());
  await canvas.focus();
  await canvas.press("ArrowRight");
  await expect(x).toHaveValue(String(afterDrag + 1));

  await inspector.getByRole("radio", { name: "Round", exact: true }).click();
  await expect(
    inspector.getByRole("radio", { name: "Round", exact: true }),
  ).toBeChecked();
  await width.fill("");
  await expect(width).toHaveValue("");
  await width.fill("120");
  await width.press("Enter");
  const height = inspector.getByLabel("Height", { exact: true });
  await height.fill("100");
  await height.press("Enter");
  const rotation = inspector.getByLabel("Rotation (°)", { exact: true });
  await rotation.fill("15");
  await rotation.press("Enter");
  await expect(rotation).toHaveValue("15");
  // Reposition the rotated table using the accessible fields, away from its neighbours.
  await x.fill("80");
  await x.press("Enter");
  await y.fill("200");
  await y.press("Enter");
  const savedX = await x.inputValue();
  const savedY = await y.inputValue();

  const undo = page.getByRole("button", {
    name: "Undo (⌘/Ctrl Z)",
    exact: true,
  });
  const redo = page.getByRole("button", {
    name: "Redo (⌘/Ctrl Shift Z)",
    exact: true,
  });
  await undo.click();
  await expect(y).not.toHaveValue(savedY);
  await redo.click();
  await expect(y).toHaveValue(savedY);
  await expect(rotation).toHaveValue("15");

  await page.getByRole("button", { name: "Fixture", exact: true }).click();
  await page
    .getByRole("menuitem", { name: "Bar / counter", exact: true })
    .click();
  const fixtureLabel = inspector.getByLabel("Label", { exact: true });
  await fixtureLabel.fill("Guest counter");
  await fixtureLabel.press("Enter");
  await expect(
    objects.getByRole("button", { name: "Guest counter", exact: true }),
  ).toBeVisible();
  await save.click();
  await expect(save).toBeDisabled();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(
    objects.getByRole("button", { name: "Guest counter", exact: true }),
  ).toBeVisible();
  await objects.getByRole("button", { name: "A", exact: true }).click();
  await expect(x).toHaveValue(savedX);
  await expect(y).toHaveValue(savedY);
  await expect(width).toHaveValue("120");
  await expect(height).toHaveValue("100");
  await expect(rotation).toHaveValue("15");
  await expect(
    inspector.getByRole("radio", { name: "Round", exact: true }),
  ).toBeChecked();
  await test.step("Concurrent saves preserve the local draft and require explicit reload", async () => {
    const otherEditor = await page.context().newPage();
    try {
      await otherEditor.goto("/hospitality/tables/floor-plan?mode=edit");
      await otherEditor
        .getByLabel("Room objects", { exact: true })
        .getByRole("button", { name: "A", exact: true })
        .click();
      const otherWidth = otherEditor
        .getByLabel("Floor plan inspector", { exact: true })
        .getByLabel("Width", { exact: true });
      await expect(otherWidth).toHaveValue("120");
      await width.fill("140");
      await width.press("Enter");
      await expect(save).toBeEnabled();

      await otherWidth.fill("130");
      await otherWidth.press("Enter");
      await otherEditor
        .getByRole("button", { name: "Save layout", exact: true })
        .click();
      await expect(
        otherEditor.getByText("Saved", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(
          "This room or its tables changed elsewhere. Your draft is still here. Reload the latest layout before editing further.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(width).toHaveValue("140");
      await expect(save).toBeDisabled();

      await page
        .getByRole("button", { name: "Reload latest", exact: true })
        .click();
      const guard = page.getByRole("alertdialog", {
        name: "Save your layout first?",
        exact: true,
      });
      await expect(guard).toBeVisible();
      await expect(
        guard.getByRole("button", { name: "Save and continue", exact: true }),
      ).toHaveCount(0);
      await guard
        .getByRole("button", { name: "Discard changes", exact: true })
        .click();
      await objects.getByRole("button", { name: "A", exact: true }).click();
      await expect(width).toHaveValue("130");
      await expect(
        page.getByRole("button", { name: "Reload latest", exact: true }),
      ).toHaveCount(0);
      await expect(save).toBeDisabled();

      // Restore the original saved dimensions for the remaining persistence checks.
      await width.fill("120");
      await width.press("Enter");
      await save.click();
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      await expect(save).toBeDisabled();
    } finally {
      await otherEditor.close();
    }
  });
  await page
    .getByRole("combobox", { name: "Highlight combination", exact: true })
    .click();
  await page
    .getByRole("option", { name: "A + B · 4 seats", exact: true })
    .click();
  for (const table of [tableA, tableB]) {
    await expect(
      page
        .getByTestId(`floor-item-${table._id}`)
        .locator('rect[stroke-dasharray="5 4"]'),
    ).toHaveCount(1);
  }
  await expect(
    page
      .getByTestId(`floor-item-${tableC._id}`)
      .locator('rect[stroke-dasharray="5 4"]'),
  ).toHaveCount(0);
  await expect(save).toBeDisabled();

  // Keep the selected table inspector visible in each full-page evidence image.
  for (const viewport of [
    { width: 1280, height: 900, label: "desktop" },
    { width: 390, height: 844, label: "390" },
    { width: 320, height: 844, label: "320" },
  ]) {
    await page.setViewportSize(viewport);
    await page.mouse.move(0, 0);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`floor-plan-${viewport.label}.png`),
      fullPage: true,
      animations: "disabled",
      style: "nextjs-portal { visibility: hidden; }",
    });
  }
  await page.setViewportSize({ width: 1280, height: 900 });

  // A navigation attempt must not silently save or drop the new draft.
  await width.fill("140");
  await width.press("Enter");
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.reload();
  await expect(
    page.getByText(
      "Your unsaved layout was recovered in this tab. Save it when ready.",
      { exact: true },
    ),
  ).toBeVisible();
  await objects.getByRole("button", { name: "A", exact: true }).click();
  await expect(width).toHaveValue("140");
  await page
    .getByRole("button", { name: "Back to tables", exact: true })
    .click();
  const guard = page.getByRole("alertdialog", {
    name: "Save your layout first?",
    exact: true,
  });
  await expect(guard).toBeVisible();
  await guard
    .getByRole("button", { name: "Keep editing", exact: true })
    .click();
  await expect(width).toHaveValue("140");
  await page
    .getByRole("button", { name: "Back to tables", exact: true })
    .click();
  await guard
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await expect(page).toHaveURL(/\/hospitality\/tables$/);
  await page.goto("/hospitality/tables/floor-plan?mode=edit");
  await objects.getByRole("button", { name: "A", exact: true }).click();
  await expect(width).toHaveValue("120");
  await expect(save).toBeDisabled();
  await page
    .getByRole("button", { name: "Back to tables", exact: true })
    .click();
  await expect(page).toHaveURL(/\/hospitality\/tables$/);
  await page.setViewportSize(initialViewport);
}
