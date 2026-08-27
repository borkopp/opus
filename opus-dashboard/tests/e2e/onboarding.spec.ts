import { expect, test } from "@playwright/test";

const emailAddress = process.env.E2E_BETTER_AUTH_EMAIL;
const otp = process.env.E2E_BETTER_AUTH_OTP;
const canAuthenticate = Boolean(emailAddress && otp);

test.describe("beauty launch journey", () => {
  test.skip(
    !canAuthenticate,
    "A local Better Auth test email and OTP are required.",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(emailAddress!);
    await page.getByRole("button", { name: "Continue with email" }).click();
    await page.getByLabel("Sign-in code").fill(otp!);
    await page.getByRole("button", { name: "Verify and continue" }).click();
    await expect(page).toHaveURL(/\/onboarding(?:\?|$)/);
  });

  test("gates hospitality and resumes the beauty journey from the server", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.getByRole("button", { name: /hospitality/i }).click();
    await expect(page.getByText(/coming soon/i)).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: /beauty/i }).click();
    await expect(page.getByText(/tell us about/i)).toBeVisible();
  });

  test("rejects a client-supplied tenant mismatch", async ({ page }) => {
    const response = await page.request.post("/api/chat", {
      data: {
        orgId: "not-a-real-convex-id",
        sessionId: "tampered-session",
        message: "Book me",
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
