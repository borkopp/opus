import { createHmac } from "node:crypto";
import { describe, expect, test } from "vitest";
import { verifyResendWebhookSignature } from "../convex/emailWebhooks";

describe("Resend webhook verification", () => {
  test("accepts the current signed payload and rejects tampering and replay", async () => {
    const now = Date.now();
    const timestamp = String(Math.floor(now / 1_000));
    const messageId = "msg_test_webhook";
    const payload = JSON.stringify({ type: "email.delivered" });
    const secretBytes = Buffer.from("opus-resend-webhook-test-secret");
    const secret = `whsec_${secretBytes.toString("base64")}`;
    const signature = createHmac("sha256", secretBytes)
      .update(`${messageId}.${timestamp}.${payload}`)
      .digest("base64");

    await expect(
      verifyResendWebhookSignature({
        payload,
        messageId,
        timestamp,
        signature: `v1,${signature}`,
        secret,
        now,
      }),
    ).resolves.toBe(true);
    await expect(
      verifyResendWebhookSignature({
        payload: `${payload} `,
        messageId,
        timestamp,
        signature: `v1,${signature}`,
        secret,
        now,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyResendWebhookSignature({
        payload,
        messageId,
        timestamp,
        signature: `v1,${signature}`,
        secret,
        now: now + 6 * 60 * 1_000,
      }),
    ).resolves.toBe(false);
  });
});
