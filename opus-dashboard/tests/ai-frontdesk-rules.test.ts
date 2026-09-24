import { createHmac } from "node:crypto";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  aiSettingsError,
  isExplicitConfirmation,
  parseInstagramEvents,
  parseReply,
  withinReplyHours,
} from "../convex/ai/rules";
import { validInstagramSignature } from "../convex/ai/webhooks";
import { encryptToken, decryptToken } from "../convex/ai/instagram";

const now = Date.parse("2026-09-28T07:30:00Z"); // Monday 09:30 in Skopje

afterEach(() => vi.unstubAllEnvs());

describe("AI frontdesk trust boundaries", () => {
  test("verifies the exact signed body and fails closed without a secret", async () => {
    const raw = '{"object":"instagram","entry":[]}';
    const secret = "test-instagram-app-secret";
    const signature = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    expect(await validInstagramSignature(raw, signature, secret)).toBe(true);
    expect(await validInstagramSignature(raw + " ", signature, secret)).toBe(
      false,
    );
    expect(await validInstagramSignature(raw, signature, undefined)).toBe(
      false,
    );
    expect(await validInstagramSignature(raw, "sha256=short", secret)).toBe(
      false,
    );
  });

  test("only accepts messages addressed to the connected account and preserves attachment handoff", () => {
    const make = (message: unknown, recipient = "studio") => ({
      sender: { id: "client" },
      recipient: { id: recipient },
      timestamp: now,
      message,
    });
    const payload = {
      object: "instagram",
      entry: [
        {
          id: "studio",
          messaging: [
            make({ mid: "text", text: "Hello" }),
            make({ mid: "image", attachments: [{ type: "image" }] }),
            make({ mid: "wrong", text: "Hello" }, "another-studio"),
            make({ text: "No message ID" }),
          ],
        },
      ],
    };
    expect(parseInstagramEvents(payload, now)).toEqual([
      {
        accountId: "studio",
        senderId: "client",
        messageId: "text",
        text: "Hello",
        timestamp: now,
        unsupported: false,
        echo: false,
      },
      {
        accountId: "studio",
        senderId: "client",
        messageId: "image",
        text: "",
        timestamp: now,
        unsupported: true,
        echo: false,
      },
    ]);
    expect(
      parseInstagramEvents({ object: "page", entry: payload.entry }, now),
    ).toEqual([]);
    expect(
      parseInstagramEvents(
        { object: "instagram", entry: [null, { messaging: "bad" }] },
        now,
      ),
    ).toEqual([]);
  });

  test("uses the studio timezone, including daylight saving and closed schedules", () => {
    const settings = {
      timezone: "Europe/Skopje",
      aiWorkingHoursEnabled: true,
      aiWorkingHours: [{ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }],
    };
    expect(withinReplyHours(settings, now)).toBe(true);
    expect(withinReplyHours(settings, Date.parse("2026-09-28T08:00:00Z"))).toBe(
      false,
    );
    expect(withinReplyHours(settings, Date.parse("2026-12-07T08:30:00Z"))).toBe(
      true,
    );
    expect(withinReplyHours({ ...settings, aiWorkingHours: [] }, now)).toBe(
      false,
    );
    expect(
      withinReplyHours({ ...settings, aiWorkingHoursEnabled: false }, now),
    ).toBe(true);
  });

  test("does not treat qualified or ambiguous consent as a booking confirmation", () => {
    for (const text of [
      "Confirm",
      "Yes!",
      "Потврдувам",
      "Да.",
      "da potvrduvam",
    ])
      expect(isExplicitConfirmation(text)).toBe(true);
    for (const text of [
      "yes but tomorrow",
      "confirm?",
      "don't confirm",
      "Не",
      "да, ама во 15 часот",
      "I said yes earlier",
    ])
      expect(isExplicitConfirmation(text)).toBe(false);
  });

  test("requires valid confidence and bounded, structured output", () => {
    expect(
      parseReply('{"message":"Hello","confidenceScore":0.9,"handoff":false}'),
    ).toMatchObject({ confidenceScore: 0.9 });
    for (const value of [
      "plain text",
      '{"message":"Hello","confidenceScore":2,"handoff":false}',
      '{"message":"Hello","handoff":false}',
    ])
      expect(parseReply(value)).toBeNull();
    expect(
      parseReply(
        JSON.stringify({
          message: "a".repeat(1001),
          confidenceScore: 1,
          handoff: false,
        }),
      ),
    ).toBeNull();
  });

  test("validates context size and working hours on the server", () => {
    const settings = {
      aiPersonaName: "Aria",
      aiConfidenceThreshold: 0.7,
      aiStudioContext: "We use X gel.",
    };
    expect(aiSettingsError(settings)).toBeNull();
    expect(
      aiSettingsError({ ...settings, aiStudioContext: "x".repeat(12_001) }),
    ).toContain("12,000");
    expect(
      aiSettingsError({ ...settings, aiConfidenceThreshold: 0.3 }),
    ).toContain("0.7");
    expect(
      aiSettingsError({
        ...settings,
        aiWorkingHoursEnabled: true,
        aiWorkingHours: [],
      }),
    ).toContain("reply day");
    expect(
      aiSettingsError({
        ...settings,
        aiWorkingHours: [
          { dayOfWeek: 9, startTime: "25:00", endTime: "10:00" },
        ],
      }),
    ).toContain("valid start");
  });

  test("encrypts stored Instagram tokens and detects tampering", () => {
    vi.stubEnv("FRONTDESK_TOKEN_SECRET", "a".repeat(32));
    const encrypted = encryptToken("test-provider-token");
    expect(encrypted).not.toContain("test-provider-token");
    expect(decryptToken(encrypted)).toBe("test-provider-token");
    const [iv, tag, value] = encrypted.split(".");
    expect(() =>
      decryptToken(`${iv}.${tag}.${value.slice(0, -3)}AAA`),
    ).toThrow();
  });
});
