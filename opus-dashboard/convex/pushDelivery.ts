"use node";
import { v } from "convex/values";
import webPush from "web-push";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { PreparedPush } from "./pushQueue";

type ExpoTicket = {
  status?: string;
  id?: string;
  details?: { error?: string };
};
const headers = () => {
  const accessToken = process.env.EXPO_PUSH_ACCESS_TOKEN?.trim();
  return {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
};

export const send = internalAction({
  args: { notificationId: v.id("notifications") },
  handler: async (
    ctx,
    args,
  ): Promise<"sent" | "failed" | "retrying" | "cancelled" | "ignored"> => {
    const prepared: PreparedPush = await ctx.runMutation(
      internal.pushQueue.prepare,
      args,
    );
    if (prepared.status !== "ready") return prepared.status;
    const finish = (
      result: "sent" | "failed" | "retry",
      code?: string,
      ticketId?: string,
      invalidDevice = false,
    ) =>
      ctx.runMutation(internal.pushQueue.finish, {
        ...args,
        result,
        code,
        ticketId,
        invalidDevice,
        deviceVersion: prepared.deviceVersion,
      });
    if (prepared.kind === "expo") {
      try {
        const response = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: headers(),
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            to: prepared.token,
            title: prepared.title,
            body: prepared.body,
            data: { notificationId: args.notificationId },
            sound: prepared.sound ? "default" : null,
            channelId: prepared.sound
              ? "opus-appointments"
              : "opus-appointments-silent",
            ttl: 3600,
          }),
        });
        if (!response.ok)
          return finish(
            response.status === 429 || response.status >= 500
              ? "retry"
              : "failed",
            `Expo HTTP ${response.status}`,
          );
        const body = (await response.json()) as {
          data?: ExpoTicket | ExpoTicket[];
        };
        const ticket = Array.isArray(body.data) ? body.data[0] : body.data;
        if (ticket?.status === "ok" && typeof ticket.id === "string")
          return finish("sent", undefined, ticket.id);
        const code = ticket?.details?.error;
        return finish(
          code === "MessageRateExceeded" ? "retry" : "failed",
          "Expo rejected the push ticket.",
          undefined,
          code === "DeviceNotRegistered",
        );
      } catch {
        return finish("retry", "Expo request timed out or failed.");
      }
    }
    if (!prepared.subscription)
      return finish("failed", "Browser subscription unavailable.");
    try {
      await webPush.sendNotification(
        prepared.subscription,
        JSON.stringify({
          title: prepared.title,
          body: prepared.body,
          notificationId: args.notificationId,
          silent: !prepared.sound,
        }),
        {
          TTL: 3600,
          urgency: "normal",
          timeout: 10000,
          vapidDetails: {
            subject: "mailto:hello@opus.mk",
            publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY!,
            privateKey: process.env.WEB_PUSH_VAPID_PRIVATE_KEY!,
          },
        },
      );
      return finish("sent");
    } catch (error) {
      const status =
        error && typeof error === "object" && "statusCode" in error
          ? Number(error.statusCode)
          : 0;
      return finish(
        status === 429 || status >= 500 || status === 0 ? "retry" : "failed",
        `Browser push rejected (${status || "network"}).`,
        undefined,
        status === 404 || status === 410,
      );
    }
  },
});

export const checkReceipt = internalAction({
  args: {
    notificationId: v.id("notifications"),
    deviceVersion: v.number(),
    attempt: v.number(),
  },
  handler: async (ctx, args): Promise<void> => {
    const ticket: string | null = await ctx.runQuery(
      internal.pushQueue.receiptTicket,
      { notificationId: args.notificationId },
    );
    if (!ticket) return;
    try {
      const response = await fetch(
        "https://exp.host/--/api/v2/push/getReceipts",
        {
          method: "POST",
          headers: headers(),
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({ ids: [ticket] }),
        },
      );
      if (response.ok) {
        const body = (await response.json()) as {
          data?: Record<string, ExpoTicket>;
        };
        const receipt = body.data?.[ticket];
        if (receipt?.status === "ok" || receipt?.status === "error") {
          await ctx.runMutation(internal.pushQueue.recordReceipt, {
            notificationId: args.notificationId,
            deviceVersion: args.deviceVersion,
            result: receipt.status === "ok" ? "provider_accepted" : "failed",
            invalidDevice: receipt.details?.error === "DeviceNotRegistered",
          });
          return;
        }
      }
    } catch {
      /* Receipts can appear later; bounded retries below. */
    }
    if (args.attempt < 3)
      await ctx.scheduler.runAfter(
        15 * 60000,
        internal.pushDelivery.checkReceipt,
        { ...args, attempt: args.attempt + 1 },
      );
    else
      await ctx.runMutation(internal.pushQueue.recordReceipt, {
        notificationId: args.notificationId,
        deviceVersion: args.deviceVersion,
        result: "unknown",
        invalidDevice: false,
      });
  },
});
