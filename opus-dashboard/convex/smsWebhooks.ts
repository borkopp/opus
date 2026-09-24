import { v } from "convex/values";
import { internal } from "./_generated/api";
import { httpAction, internalMutation } from "./_generated/server";
import {
  normalizeSmsPhone,
  smsCallbackBaseUrl,
  verifyTwilioSignature,
} from "./lib/sms";

export const recordTwilioDeliveryEvent = internalMutation({
  args: {
    orgId: v.string(),
    notificationId: v.string(),
    messageId: v.string(),
    recipient: v.string(),
    status: v.string(),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<"recorded" | "ignored"> => {
    const orgId = ctx.db.normalizeId("orgs", args.orgId);
    const id = ctx.db.normalizeId("notifications", args.notificationId);
    if (!orgId || !id) return "ignored";
    const existing = await ctx.db.get(id);
    if (
      !existing ||
      existing.orgId !== orgId ||
      existing.channel !== "sms" ||
      existing.status === "cancelled" ||
      existing.smsDispatchStartedAt === undefined ||
      existing.recipientAddress !== normalizeSmsPhone(args.recipient)
    )
      return "ignored";
    if (
      existing.externalMessageId &&
      existing.externalMessageId !== args.messageId
    )
      return "ignored";
    const failed = ["failed", "undelivered", "canceled"].includes(args.status);
    const delivered = args.status === "delivered";
    if (
      !failed &&
      !delivered &&
      !["accepted", "queued", "sending", "sent"].includes(args.status)
    )
      return "ignored";
    const deliveryStatus = delivered
      ? ("delivered" as const)
      : failed
        ? ("failed" as const)
        : ("accepted" as const);
    // Callbacks can be duplicated or arrive out of order. Keep terminal results.
    if (
      existing.deliveryStatus === "delivered" ||
      (existing.deliveryProvider === "twilio" &&
        existing.deliveryStatus === "failed" &&
        !delivered) ||
      (existing.externalMessageId && existing.deliveryStatus === deliveryStatus)
    )
      return "ignored";
    const now = Date.now();
    const updates = {
      status: delivered
        ? ("delivered" as const)
        : failed
          ? ("failed" as const)
          : ("sent" as const),
      deliveryStatus,
      deliveryProvider: "twilio" as const,
      externalMessageId: args.messageId,
      sentAt: existing.sentAt ?? existing.smsDispatchStartedAt,
      ...(delivered ? { deliveredAt: now } : {}),
      deliveryUpdatedAt: now,
      processingStartedAt: undefined,
      attemptCount: Math.max(1, existing.attemptCount ?? 0),
      failureReason: failed
        ? `Twilio reported ${args.status}${args.errorCode ? ` (code ${args.errorCode})` : ""}.`
        : undefined,
    };
    await ctx.db.patch(id, updates);
    await ctx.db.insert("audit_log", {
      orgId,
      actorType: "system",
      action: `notification.sms_${deliveryStatus}`,
      resourceType: "notifications",
      resourceId: id,
      before: {
        status: existing.status,
        deliveryStatus: existing.deliveryStatus,
      },
      after: updates,
      createdAt: now,
    });
    return "recorded";
  },
});

export const twilioWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.TWILIO_AUTH_TOKEN?.trim();
  const base = smsCallbackBaseUrl();
  if (!secret || !base)
    return new Response("SMS webhook is not configured.", { status: 503 });
  const url = new URL(request.url);
  const params = new URLSearchParams(await request.text());
  if (
    !(await verifyTwilioSignature(
      `${base}${url.search}`,
      params,
      request.headers.get("x-twilio-signature") ?? "",
      secret,
    )) ||
    params.get("AccountSid") !== process.env.TWILIO_ACCOUNT_SID?.trim()
  )
    return new Response("Invalid signature.", { status: 401 });
  const messageId = params.get("MessageSid") ?? "";
  const orgId = url.searchParams.get("orgId");
  const notificationId = url.searchParams.get("notificationId");
  if (!orgId || !notificationId || !/^SM[0-9a-f]{32}$/i.test(messageId))
    return new Response("Invalid event.", { status: 400 });
  const errorCode = params.get("ErrorCode");
  await ctx.runMutation(internal.smsWebhooks.recordTwilioDeliveryEvent, {
    orgId,
    notificationId,
    messageId,
    recipient: params.get("To") ?? "",
    status: params.get("MessageStatus") ?? "",
    ...(errorCode && /^\d{1,8}$/.test(errorCode) ? { errorCode } : {}),
  });
  return new Response("OK", { status: 200 });
});
