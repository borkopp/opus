import { v } from "convex/values";
export const pushEventValidator = v.union(
  v.literal("new_booking"),
  v.literal("booking_changed"),
  v.literal("booking_cancelled"),
  v.literal("booking_reminder"),
  v.literal("no_show"),
  v.literal("ai_handoff"),
);
export const pushPreferencesValidator = v.object({
  mobileEnabled: v.boolean(),
  browserEnabled: v.boolean(),
  newBookings: v.boolean(),
  changes: v.boolean(),
  cancellations: v.boolean(),
  reminders: v.boolean(),
  noShows: v.boolean(),
  aiHandoffs: v.boolean(),
  scope: v.union(v.literal("mine"), v.literal("studio")),
  reminderMinutes: v.number(),
  sound: v.boolean(),
  showPreview: v.boolean(),
  quietHours: v.boolean(),
  quietStart: v.string(),
  quietEnd: v.string(),
});
export const webPushSubscriptionValidator = v.object({
  endpoint: v.string(),
  keys: v.object({ p256dh: v.string(), auth: v.string() }),
});
