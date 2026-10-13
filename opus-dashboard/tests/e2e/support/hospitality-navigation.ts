import { expect, test, type Page } from "@playwright/test";

type VenuePage = "Reservations" | "Tables" | "Venue setup";
type VenueRole = "owner" | "staff";

export async function assertHospitalityNavigation(
  page: Page,
  current: VenuePage,
  role: VenueRole = "owner",
) {
  const navigation = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(navigation).toHaveCount(1);
  await expect(navigation).toBeVisible();
  const labels =
    role === "staff"
      ? ["Reservations", "Tables"]
      : ["Reservations", "Tables", "Venue setup"];
  await expect(navigation.getByRole("link")).toHaveCount(labels.length);
  for (const name of labels)
    await expect(
      navigation.getByRole("link", { name, exact: true }),
    ).toBeVisible();
  await expect(navigation.locator('[aria-current="page"]')).toHaveCount(1);
  await expect(
    navigation.getByRole("link", { name: current, exact: true }),
  ).toHaveAttribute("aria-current", "page");
  if (role === "staff")
    await expect(
      navigation.getByRole("link", { name: "Venue setup", exact: true }),
    ).toHaveCount(0);

  if (page.viewportSize()!.width <= 760) {
    const layout = await navigation.evaluate((element) => ({
      position: getComputedStyle(element).position,
      bottom: element.getBoundingClientRect().bottom,
      viewportHeight: window.innerHeight,
      paddingBottom: parseFloat(getComputedStyle(element).paddingBottom),
    }));
    expect(layout.position).toBe("fixed");
    expect(Math.abs(layout.bottom - layout.viewportHeight)).toBeLessThanOrEqual(
      1,
    );
    expect(layout.paddingBottom).toBeGreaterThanOrEqual(6);
    const scrollPosition = await page.evaluate(() => window.scrollY);
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const navigationBox = await navigation.boundingBox();
    const contentBox = await page.locator("#dashboard-content").boundingBox();
    expect(contentBox!.y + contentBox!.height).toBeLessThanOrEqual(
      navigationBox!.y + 1,
    );
    await page.evaluate(
      (position) => window.scrollTo(0, position),
      scrollPosition,
    );
  }
}

export async function captureHospitalityWorkspace(
  page: Page,
  stage: string,
  current: VenuePage,
  role: VenueRole = "owner",
) {
  const initialViewport = page.viewportSize()!;
  // The shared Sonner toaster expires success messages itself. Moving the
  // pointer away prevents hover from pausing its timer during visual evidence.
  await page.mouse.move(0, 0);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, {
    timeout: 10_000,
  });
  for (const viewport of [
    { width: 1280, height: 900, label: "desktop" },
    { width: 390, height: 844, label: "390" },
    { width: 320, height: 844, label: "320" },
  ]) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await assertHospitalityNavigation(page, current, role);
    const switcher = page.getByRole("combobox", {
      name: "Switch business",
      exact: true,
    });
    if (await switcher.count()) await expect(switcher).toBeVisible();
    if (role === "owner" && current !== "Reservations") {
      await expect(
        viewport.width < 768
          ? page.getByRole("combobox", { name: "Section", exact: true })
          : page.getByRole("tablist", { name: "Sections", exact: true }),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `${stage} should fit the ${viewport.label} viewport`,
    ).toBe(true);
    await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, {
      timeout: 10_000,
    });
    await page.screenshot({
      path: test.info().outputPath(`${stage}-${viewport.label}.png`),
      fullPage: true,
      animations: "disabled",
      // Hide only the development framework badge, never application controls.
      style: "nextjs-portal { visibility: hidden; }",
    });
  }
  await page.setViewportSize(initialViewport);
}
