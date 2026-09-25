import { Webhook } from "standardwebhooks";
import { z } from "zod";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { polarConfig } from "./lib/polar";

const customerSchema = z.object({
  id: z.string().min(1),
  external_id: z.string().nullable().optional(),
});
const envelopeSchema = z.object({ type: z.string(), data: z.unknown() });
const supportedEvents = new Set([
  "customer.state_changed",
  "customer.deleted",
  "subscription.created",
  "subscription.updated",
  "subscription.active",
  "subscription.canceled",
  "subscription.uncanceled",
  "subscription.revoked",
  "subscription.past_due",
  "subscription.paused",
  "subscription.resumed",
  "order.paid",
  "order.refunded",
]);

export const polarWebhook = httpAction(async (ctx, request) => {
  const secret = polarConfig().webhookSecret;
  if (!secret)
    return new Response("Webhook is not configured.", { status: 503 });
  const body = await request.text();
  if (body.length > 1_000_000)
    return new Response("Payload too large.", { status: 413 });
  const headers = {
    "webhook-id": request.headers.get("webhook-id") ?? "",
    "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
    "webhook-signature": request.headers.get("webhook-signature") ?? "",
  };
  let verified: unknown;
  try {
    verified = new Webhook(secret).verify(body, headers);
  } catch {
    // Polar secrets predating 2026-09-08 use the full secret's UTF-8 bytes.
    // Both paths verify the signature and five-minute delivery timestamp.
    try {
      verified = new Webhook(secret, { format: "raw" }).verify(body, headers);
    } catch {
      return new Response("Invalid signature.", { status: 401 });
    }
  }
  const event = envelopeSchema.safeParse(verified);
  if (!event.success) return new Response("Invalid event.", { status: 400 });
  if (!supportedEvents.has(event.data.type)) return new Response("Ignored.");
  const customer = event.data.type.startsWith("customer.")
    ? customerSchema.safeParse(event.data.data)
    : z.object({ customer: customerSchema }).safeParse(event.data.data);
  if (!customer.success)
    return new Response("Invalid customer.", { status: 400 });
  const data =
    "customer" in customer.data ? customer.data.customer : customer.data;
  if (!data.external_id) return new Response("Ignored.");
  // Persist the receipt and schedule reconciliation atomically, before ACK.
  // Always fetch current provider state so replayed/out-of-order events cannot
  // resurrect an expired subscription or overwrite a newer renewal.
  await ctx.runMutation(internal.billing.recordWebhook, {
    externalCustomerId: data.external_id,
    customerId: data.id,
    eventId: headers["webhook-id"],
    eventType: event.data.type,
  });
  return new Response("OK");
});
