import { v } from "convex/values";
import { internal } from "./_generated/api";
import { httpAction, internalMutation } from "./_generated/server";

const RESEND_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

const resendDeliveryEventValidator = v.union(
  v.literal("email.delivered"),
  v.literal("email.delivery_delayed"),
  v.literal("email.bounced"),
  v.literal("email.failed"),
  v.literal("email.suppressed"),
  v.literal("email.complained"),
);

type ResendDeliveryEvent =
  | "email.delivered"
  | "email.delivery_delayed"
  | "email.bounced"
  | "email.failed"
  | "email.suppressed"
  | "email.complained";

function decodeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function encodeBase64(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function timingSafeEqual(first: string, second: string) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyResendWebhookSignature(args: {
  payload: string;
  messageId: string;
  timestamp: string;
  signature: string;
  secret: string;
  now?: number;
}) {
  const timestampSeconds = Number(args.timestamp);
  const nowSeconds = Math.floor((args.now ?? Date.now()) / 1_000);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > RESEND_SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  let secretBytes: Uint8Array;
  try {
    secretBytes = decodeBase64(
      args.secret.startsWith("whsec_") ? args.secret.slice(6) : args.secret,
    );
  } catch {
    return false;
  }

  const secretBuffer = new ArrayBuffer(secretBytes.byteLength);
  new Uint8Array(secretBuffer).set(secretBytes);
  const key = await crypto.subtle.importKey(
    "raw",
    secretBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signedPayload = `${args.messageId}.${args.timestamp}.${args.payload}`;
  const expected = encodeBase64(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload),
    ),
  );
  const supplied = args.signature
    .split(/\s+/)
    .map((entry) => entry.split(",", 2))
    .filter(([version, signature]) => version === "v1" && Boolean(signature))
    .map(([, signature]) => signature);
  return supplied.some((signature) => timingSafeEqual(signature, expected));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseResendEvent(payload: string):
  | {
      type: ResendDeliveryEvent;
      eventAt: number;
      emailId: string;
      orgId: string;
      notificationId: string;
    }
  | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) return undefined;
  const supportedEvents = new Set<ResendDeliveryEvent>([
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.failed",
    "email.suppressed",
    "email.complained",
  ]);
  if (
    typeof parsed.type !== "string" ||
    !supportedEvents.has(parsed.type as ResendDeliveryEvent) ||
    typeof parsed.data.email_id !== "string" ||
    !isRecord(parsed.data.tags) ||
    typeof parsed.data.tags.org_id !== "string" ||
    typeof parsed.data.tags.notification_id !== "string"
  ) {
    return undefined;
  }
  const parsedEventAt =
    typeof parsed.created_at === "string"
      ? Date.parse(parsed.created_at)
      : Number.NaN;
  return {
    type: parsed.type as ResendDeliveryEvent,
    eventAt: Number.isFinite(parsedEventAt) ? parsedEventAt : Date.now(),
    emailId: parsed.data.email_id,
    orgId: parsed.data.tags.org_id,
    notificationId: parsed.data.tags.notification_id,
  };
}

function eventState(eventType: ResendDeliveryEvent) {
  switch (eventType) {
    case "email.delivered":
      return {
        status: "delivered" as const,
        deliveryStatus: "delivered" as const,
        failureReason: undefined,
      };
    case "email.delivery_delayed":
      return {
        status: undefined,
        deliveryStatus: "delayed" as const,
        failureReason: "Resend reported a temporary delivery delay.",
      };
    case "email.bounced":
      return {
        status: "failed" as const,
        deliveryStatus: "bounced" as const,
        failureReason: "Resend reported a permanent recipient bounce.",
      };
    case "email.failed":
      return {
        status: "failed" as const,
        deliveryStatus: "failed" as const,
        failureReason: "Resend reported a delivery failure.",
      };
    case "email.suppressed":
      return {
        status: "failed" as const,
        deliveryStatus: "suppressed" as const,
        failureReason: "Resend suppressed delivery to this recipient.",
      };
    case "email.complained":
      return {
        status: "delivered" as const,
        deliveryStatus: "complained" as const,
        failureReason: "The recipient reported this email as spam.",
      };
  }
}

export const recordResendDeliveryEvent = internalMutation({
  args: {
    orgId: v.string(),
    notificationId: v.string(),
    emailId: v.string(),
    eventType: resendDeliveryEventValidator,
    eventAt: v.number(),
  },
  handler: async (ctx, args): Promise<"recorded" | "ignored" | "not_ready"> => {
    const orgId = ctx.db.normalizeId("orgs", args.orgId);
    const notificationId = ctx.db.normalizeId(
      "notifications",
      args.notificationId,
    );
    if (!orgId || !notificationId) return "ignored";
    const existing = await ctx.db.get(notificationId);
    if (!existing || existing.orgId !== orgId) return "ignored";
    if (existing.status === "pending") return "not_ready";
    if (existing.status === "cancelled") return "ignored";
    if (existing.deliveryProvider !== "resend") return "ignored";
    if (
      existing.externalMessageId &&
      existing.externalMessageId !== args.emailId
    ) {
      return "ignored";
    }

    const state = eventState(args.eventType);
    if (
      existing.deliveryStatus === state.deliveryStatus &&
      (existing.deliveryUpdatedAt ?? 0) >= args.eventAt
    ) {
      return "recorded";
    }

    const before = existing;
    await ctx.db.patch(notificationId, {
      ...(state.status ? { status: state.status } : {}),
      deliveryStatus: state.deliveryStatus,
      deliveryUpdatedAt: args.eventAt,
      deliveredAt:
        args.eventType === "email.delivered"
          ? args.eventAt
          : existing.deliveredAt,
      failureReason: state.failureReason,
    });
    const updated = await ctx.db.get(notificationId);
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "system",
      action: `notification.${args.eventType.replace("email.", "")}`,
      resourceType: "notifications",
      resourceId: notificationId,
      before,
      after: updated,
      createdAt: Date.now(),
    });
    return "recorded";
  },
});

export const resendWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return new Response("Webhook is not configured.", { status: 503 });
  }
  const payload = await request.text();
  const messageId = request.headers.get("svix-id") ?? "";
  const timestamp = request.headers.get("svix-timestamp") ?? "";
  const signature = request.headers.get("svix-signature") ?? "";
  if (
    !messageId ||
    !timestamp ||
    !signature ||
    !(await verifyResendWebhookSignature({
      payload,
      messageId,
      timestamp,
      signature,
      secret,
    }))
  ) {
    return new Response("Invalid signature.", { status: 401 });
  }

  const event = parseResendEvent(payload);
  if (!event) return new Response("Ignored.", { status: 200 });
  const result = await ctx.runMutation(
    internal.emailWebhooks.recordResendDeliveryEvent,
    {
      orgId: event.orgId,
      notificationId: event.notificationId,
      emailId: event.emailId,
      eventType: event.type,
      eventAt: event.eventAt,
    },
  );
  if (result === "not_ready") {
    return new Response("Delivery record is not ready.", { status: 503 });
  }
  return new Response("OK", { status: 200 });
});
