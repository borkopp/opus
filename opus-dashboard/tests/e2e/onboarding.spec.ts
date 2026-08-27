import { expect, test } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";

const emailAddress = process.env.E2E_CLERK_USER_EMAIL;
const canAuthenticate = Boolean(
  emailAddress &&
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

test.describe("beauty launch journey", () => {
  test.skip(!canAuthenticate, "Clerk development credentials are required.");

  test.beforeEach(async ({ context, page }) => {
    await setupClerkTestingToken({ context });
    await page.goto("/login");
    await clerk.signIn({ page, emailAddress: emailAddress! });
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
