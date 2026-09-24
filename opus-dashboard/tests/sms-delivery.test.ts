import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  deliverSms,
  normalizeSmsPhone,
  renderBookingSms,
  smsProviderConfigured,
  verifyTwilioSignature,
} from "../convex/lib/sms";

const account = `AC${"a".repeat(32)}`;
const messageId = `SM${"b".repeat(32)}`;
const args = {
  to: "+38970123456",
  body: "Appointment confirmed",
  orgId: "org-one",
  notificationId: "notification-one",
};

beforeEach(() => {
  vi.stubEnv("SMS_ENABLED", "true");
  vi.stubEnv("TWILIO_ACCOUNT_SID", account);
  vi.stubEnv("TWILIO_AUTH_TOKEN", "test-token");
  vi.stubEnv("TWILIO_FROM_NUMBER", "+15005550006");
  vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "");
  vi.stubEnv("CONVEX_SITE_URL", "https://test.convex.site");
  vi.stubEnv("TWILIO_STATUS_CALLBACK_URL", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("SMS phone numbers and content", () => {
  test.each([
    "070 123 456",
    "38970123456",
    "0038970123456",
    "+389 (70) 123-456",
  ])("normalizes %s", (phone) => {
    expect(normalizeSmsPhone(phone)).toBe("+38970123456");
  });
  test.each([
    undefined,
    "",
    "123",
    "++38970123456",
    "phone +38970123456",
    "70123456",
    "+38970123456 ext 7",
  ])("skips invalid phone %s", (phone) => {
    expect(normalizeSmsPhone(phone)).toBeNull();
  });
  test("renders localized content at the booking's wall-clock time", () => {
    const data = {
      studioName: "Студио",
      serviceName: "Маникир",
      startAt: Date.UTC(2026, 8, 28, 10),
      locale: "mk-MK",
    };
    expect(renderBookingSms("booking_reminder", data)).toBe(
      "Студио: Потсетник за термин. Маникир, 28.09.2026 г. во 10:00.",
    );
    expect(
      renderBookingSms("booking_rescheduled", { ...data, locale: "en-GB" }),
    ).toContain("Appointment rescheduled. Маникир, 28/09/2026 at 10:00.");
    expect(
      renderBookingSms("booking_confirmation", {
        ...data,
        studioName: "x".repeat(300),
        serviceName: "y".repeat(300),
      }).length,
    ).toBeLessThan(210);
  });
});

describe("Twilio delivery", () => {
  test("requires an enabled, complete provider and HTTPS callback", async () => {
    expect(smsProviderConfigured()).toBe(true);
    vi.stubEnv("SMS_ENABLED", "false");
    expect(smsProviderConfigured()).toBe(false);
    await expect(deliverSms(args)).rejects.toThrow("not configured");
    vi.stubEnv("SMS_ENABLED", "true");
    vi.stubEnv(
      "TWILIO_STATUS_CALLBACK_URL",
      "http://localhost:3211/webhooks/twilio",
    );
    expect(smsProviderConfigured()).toBe(false);
  });
  test("submits form-encoded SMS with a tenant-bound callback", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ sid: messageId, status: "queued" }), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetch);
    await expect(deliverSms(args)).resolves.toBe(messageId);
    const [url, request] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `https://api.twilio.com/2010-04-01/Accounts/${account}/Messages.json`,
    );
    const body = new URLSearchParams(String(request.body));
    expect(body.get("To")).toBe(args.to);
    expect(body.get("From")).toBe("+15005550006");
    expect(body.get("Body")).toBe(args.body);
    expect(body.get("StatusCallback")).toBe(
      "https://test.convex.site/webhooks/twilio?orgId=org-one&notificationId=notification-one",
    );
    expect(new Headers(request.headers).get("authorization")).toBe(
      `Basic ${btoa(`${account}:test-token`)}`,
    );
  });
  test("uses a Messaging Service when provided", async () => {
    const service = `MG${"c".repeat(32)}`;
    vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", service);
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ sid: messageId }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetch);
    await deliverSms(args);
    const body = new URLSearchParams(fetch.mock.calls[0][1].body);
    expect(body.get("MessagingServiceSid")).toBe(service);
    expect(body.has("From")).toBe(false);
  });
  test("does not report a malformed Messaging Service as ready even with a valid sender number", () => {
    vi.stubEnv("TWILIO_MESSAGING_SERVICE_SID", "invalid-service");
    expect(smsProviderConfigured()).toBe(false);
  });
  test.each([400, 401, 429, 500, 503])(
    "only retries definite 429 rejections (HTTP %i)",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              code: 21610,
              message: "Private provider detail",
            }),
            { status },
          ),
        ),
      );
      await expect(deliverSms(args)).rejects.toMatchObject({
        retryable: status === 429,
      });
      await expect(deliverSms(args)).rejects.not.toThrow(
        "Private provider detail",
      );
    },
  );
  test("never automatically retries an ambiguous network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network timeout")),
    );
    await expect(deliverSms(args)).rejects.toMatchObject({
      retryable: false,
      message: expect.stringContaining("unconfirmed"),
    });
  });
  test("verifies every callback field and its complete URL", async () => {
    const url =
      "https://test.convex.site/webhooks/twilio?orgId=one&notificationId=two";
    const params = new URLSearchParams({
      To: args.to,
      MessageSid: messageId,
      MessageStatus: "delivered",
      AccountSid: account,
      NewProviderField: "value",
    });
    const signed =
      url +
      [...params.keys()]
        .sort()
        .map((name) => name + params.get(name))
        .join("");
    const signature = createHmac("sha1", "test-token")
      .update(signed)
      .digest("base64");
    await expect(
      verifyTwilioSignature(url, params, signature, "test-token"),
    ).resolves.toBe(true);
    await expect(
      verifyTwilioSignature(
        url.replace("orgId=one", "orgId=other"),
        params,
        signature,
        "test-token",
      ),
    ).resolves.toBe(false);
    params.set("MessageStatus", "failed");
    await expect(
      verifyTwilioSignature(url, params, signature, "test-token"),
    ).resolves.toBe(false);
    await expect(
      verifyTwilioSignature(url, params, "not base64", "test-token"),
    ).resolves.toBe(false);
  });
});
