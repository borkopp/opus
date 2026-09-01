import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  deliverEmail,
  emailFromForRoute,
  providerOrderForRoute,
  type EmailMessage,
} from "../convex/lib/emailDelivery";

const message: EmailMessage = {
  from: "OPUS <bookings@bookings.opus.mk>",
  to: "client@example.com",
  subject: "Appointment confirmed",
  html: "<p>Confirmed</p>",
  text: "Confirmed",
  idempotencyKey: "opus-notification/test",
  tags: [
    { name: "org_id", value: "org123" },
    { name: "notification_id", value: "notification123" },
  ],
};

describe("email provider routing", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("SENDER_API_TOKEN", "sender_test");
    vi.stubEnv("AUTH_EMAIL_FROM", "login@auth.opus.mk");
    vi.stubEnv("BOOKING_EMAIL_FROM", "bookings@bookings.opus.mk");
    vi.stubEnv("SENDER_AUTH_EMAIL_FROM", "login@opus.mk");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test("keeps Resend as the safe default until provider orders are enabled", () => {
    expect(providerOrderForRoute("auth")).toEqual(["resend"]);
    expect(providerOrderForRoute("booking")).toEqual(["resend"]);
    expect(emailFromForRoute("auth")).toBe("OPUS <login@auth.opus.mk>");
    expect(emailFromForRoute("booking")).toBe(
      "OPUS <bookings@bookings.opus.mk>",
    );
    expect(emailFromForRoute("auth", "sender")).toBe(
      "OPUS <login@opus.mk>",
    );
  });

  test("falls back from a Resend quota response to Sender API", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            name: "daily_quota_exceeded",
            message: "Daily quota reached",
          }),
          { status: 429 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, emailId: "sender-message" }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const authMessage = {
      ...message,
      from: emailFromForRoute("auth"),
      subject: "Your OPUS sign-in code",
    };
    const result = await deliverEmail(authMessage, {
      providers: ["resend", "sender"],
      route: "auth",
    });

    expect(result).toMatchObject({
      provider: "sender",
      externalMessageId: "sender-message",
      attempts: [
        {
          provider: "resend",
          status: "failed",
          statusCode: 429,
          errorCode: "daily_quota_exceeded",
          fallbackAllowed: true,
        },
        {
          provider: "sender",
          transport: "api",
          status: "accepted",
        },
      ],
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.resend.com/emails",
      "https://api.sender.net/v2/message/send",
    ]);
    const senderBody = JSON.parse(
      String((fetchMock.mock.calls[1][1] as RequestInit).body),
    );
    const resendBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(resendBody.from).toBe("OPUS <login@auth.opus.mk>");
    expect(senderBody).toMatchObject({
      from: { name: "OPUS", email: "login@opus.mk" },
      to: { email: "client@example.com" },
      headers: { "X-OPUS-Delivery-ID": authMessage.idempotencyKey },
    });
  });

  test("does not bypass a permanent recipient or payload rejection", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ name: "validation_error", message: "Invalid to" }),
          { status: 422 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      deliverEmail(message, { providers: ["resend", "sender"] }),
    ).rejects.toMatchObject({
      retryable: false,
      attempts: [
        expect.objectContaining({
          provider: "resend",
          statusCode: 422,
          fallbackAllowed: false,
        }),
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("keeps a temporary primary failure retryable when the fallback is unavailable", async () => {
    vi.stubEnv("SENDER_API_TOKEN", "");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "Service unavailable" }), {
        status: 503,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      deliverEmail(message, { providers: ["resend", "sender"] }),
    ).rejects.toMatchObject({
      retryable: true,
      attempts: [
        expect.objectContaining({
          provider: "resend",
          retryable: true,
        }),
        expect.objectContaining({
          provider: "sender",
          status: "skipped",
          errorCode: "not_configured",
        }),
      ],
    });
  });

  test("uses Sender SMTP when an inline calendar attachment is present", async () => {
    const senderSmtp = vi.fn().mockResolvedValue({
      ok: true as const,
      messageId: "<sender-smtp-message@bookings.opus.mk>",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await deliverEmail(
      {
        ...message,
        attachments: [
          {
            filename: "opus-appointment.ics",
            content: Buffer.from("BEGIN:VCALENDAR").toString("base64"),
          },
        ],
      },
      { providers: ["sender", "resend"], senderSmtp },
    );

    expect(result).toMatchObject({
      provider: "sender",
      externalMessageId: "<sender-smtp-message@bookings.opus.mk>",
      attempts: [
        expect.objectContaining({
          provider: "sender",
          transport: "smtp",
          status: "accepted",
        }),
      ],
    });
    expect(senderSmtp).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("falls back to Resend when Sender SMTP is temporarily unavailable", async () => {
    const senderSmtp = vi.fn().mockResolvedValue({
      ok: false as const,
      errorCode: "ETIMEDOUT",
      message: "Connection timed out",
      retryable: true,
      fallbackAllowed: true,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "resend-message" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await deliverEmail(
      {
        ...message,
        attachments: [
          {
            filename: "opus-appointment.ics",
            content: Buffer.from("BEGIN:VCALENDAR").toString("base64"),
          },
        ],
      },
      { providers: ["sender", "resend"], senderSmtp },
    );

    expect(result.provider).toBe("resend");
    expect(result.attempts).toEqual([
      expect.objectContaining({
        provider: "sender",
        transport: "smtp",
        errorCode: "ETIMEDOUT",
        fallbackAllowed: true,
      }),
      expect.objectContaining({
        provider: "resend",
        status: "accepted",
      }),
    ]);
    const resendBody = JSON.parse(
      String((fetchMock.mock.calls[0][1] as RequestInit).body),
    );
    expect(resendBody.attachments).toHaveLength(1);
  });
});
