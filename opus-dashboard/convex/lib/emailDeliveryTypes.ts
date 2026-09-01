import { v } from "convex/values";

export const emailProviderValidator = v.union(
  v.literal("resend"),
  v.literal("sender"),
);

export const emailProviderTransportValidator = v.union(
  v.literal("api"),
  v.literal("smtp"),
);

export const emailProviderAttemptStatusValidator = v.union(
  v.literal("accepted"),
  v.literal("failed"),
  v.literal("skipped"),
);

export const emailDeliveryStatusValidator = v.union(
  v.literal("accepted"),
  v.literal("delivered"),
  v.literal("delayed"),
  v.literal("bounced"),
  v.literal("complained"),
  v.literal("suppressed"),
  v.literal("failed"),
);

export const emailProviderAttemptValidator = v.object({
  provider: emailProviderValidator,
  transport: emailProviderTransportValidator,
  status: emailProviderAttemptStatusValidator,
  attemptedAt: v.number(),
  completedAt: v.number(),
  externalMessageId: v.optional(v.string()),
  statusCode: v.optional(v.number()),
  errorCode: v.optional(v.string()),
  failureReason: v.optional(v.string()),
  retryable: v.boolean(),
  fallbackAllowed: v.boolean(),
});

export type EmailProviderName = "resend" | "sender";
export type EmailProviderTransport = "api" | "smtp";
export type EmailProviderAttemptStatus = "accepted" | "failed" | "skipped";
export type EmailDeliveryStatus =
  | "accepted"
  | "delivered"
  | "delayed"
  | "bounced"
  | "complained"
  | "suppressed"
  | "failed";

export type EmailProviderAttempt = {
  provider: EmailProviderName;
  transport: EmailProviderTransport;
  status: EmailProviderAttemptStatus;
  attemptedAt: number;
  completedAt: number;
  externalMessageId?: string;
  statusCode?: number;
  errorCode?: string;
  failureReason?: string;
  retryable: boolean;
  fallbackAllowed: boolean;
};
