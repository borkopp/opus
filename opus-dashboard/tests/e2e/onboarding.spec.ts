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

  test("resumes the shortened beauty journey without branding steps", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    const progress = page.getByRole("progressbar", { name: "Studio setup" });
    await expect(progress).toHaveAttribute("aria-valuemax", "5");
    const currentStep = await progress.getAttribute("aria-valuenow");
    await page.reload();
    await expect(progress).toHaveAttribute("aria-valuenow", currentStep!);
    await expect(
      page.getByRole("button", { name: /hospitality/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /choose your dashboard theme/i }),
    ).toHaveCount(0);
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
