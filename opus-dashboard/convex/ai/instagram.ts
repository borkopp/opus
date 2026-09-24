"use node";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { ConvexError, v } from "convex/values";
import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

function tokenKey() {
  const secret = process.env.FRONTDESK_TOKEN_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Instagram token encryption is not configured.");
  return createHash("sha256").update(secret).digest();
}
export function encryptToken(token: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64url"))
    .join(".");
}
export function decryptToken(value: string) {
  const [iv, tag, encrypted] = value
    .split(".")
    .map((p) => Buffer.from(p, "base64url"));
  const cipher = createDecipheriv("aes-256-gcm", tokenKey(), iv);
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString(
    "utf8",
  );
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value)
    throw new ConvexError(
      "Instagram is not configured yet. Contact OPUS support.",
    );
  return value;
}
export function graphUrl(path: string) {
  const version = requiredEnv("INSTAGRAM_GRAPH_VERSION");
  if (!/^v\d+\.\d+$/.test(version))
    throw new Error("Invalid Instagram Graph version");
  return `https://graph.instagram.com/${version}/${path}`;
}
async function jsonRequest(
  url: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok)
    throw new ConvexError(
      "Instagram could not verify the connection. Please reconnect and grant messaging access.",
    );
  const data = await response.json();
  if (!data || typeof data !== "object" || data.error)
    throw new ConvexError("Instagram returned an invalid response.");
  return data;
}

export const startConnection = action({
  args: {},
  handler: async (ctx): Promise<{ url: string }> => {
    const { orgId, userId } = await ctx.runQuery(
      internal.ai.connections.ownerAccess,
      {},
    );
    tokenKey();
    const appId = requiredEnv("INSTAGRAM_APP_ID"),
      redirectUri = requiredEnv("INSTAGRAM_REDIRECT_URI");
    requiredEnv("INSTAGRAM_APP_SECRET");
    const state = `${orgId}.${randomBytes(32).toString("base64url")}`;
    await ctx.runMutation(internal.ai.connections.beginOAuth, {
      orgId,
      userId,
      stateHash: createHash("sha256").update(state).digest("hex"),
    });
    const url = new URL("https://www.instagram.com/oauth/authorize");
    url.search = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "instagram_business_basic,instagram_business_manage_messages",
      state,
      enable_fb_login: "0",
      force_authentication: "1",
    }).toString();
    return { url: url.toString() };
  },
});

export const finishConnection = internalAction({
  args: { code: v.string(), state: v.string() },
  handler: async (ctx, { code, state }) => {
    if (state.length > 200 || !state.includes(".") || code.length > 4_000)
      throw new ConvexError("Invalid connection request.");
    const orgId = state.split(".")[0] as Id<"orgs">;
    const pending = await ctx.runMutation(
      internal.ai.connections.consumeOAuth,
      { orgId, stateHash: createHash("sha256").update(state).digest("hex") },
    );
    const short = await jsonRequest(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: new URLSearchParams({
          client_id: requiredEnv("INSTAGRAM_APP_ID"),
          client_secret: requiredEnv("INSTAGRAM_APP_SECRET"),
          grant_type: "authorization_code",
          redirect_uri: requiredEnv("INSTAGRAM_REDIRECT_URI"),
          code,
        }),
      },
    );
    if (typeof short.access_token !== "string")
      throw new ConvexError("Instagram did not return an access token.");
    const exchangeUrl = new URL("https://graph.instagram.com/access_token");
    exchangeUrl.search = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: requiredEnv("INSTAGRAM_APP_SECRET"),
      access_token: short.access_token,
    }).toString();
    const long = await jsonRequest(exchangeUrl.toString());
    if (
      typeof long.access_token !== "string" ||
      typeof long.expires_in !== "number" ||
      long.expires_in <= 0
    )
      throw new ConvexError("Instagram did not return a long-lived token.");
    const headers = { Authorization: `Bearer ${long.access_token}` };
    const profile = await jsonRequest(graphUrl("me?fields=user_id,username"), {
      headers,
    });
    const accountId = String(profile.user_id ?? "");
    if (!/^\d+$/.test(accountId) || typeof profile.username !== "string")
      throw new ConvexError("Connect an Instagram professional account.");
    const subscription = await jsonRequest(
      graphUrl(`${accountId}/subscribed_apps`),
      {
        method: "POST",
        headers,
        body: new URLSearchParams({ subscribed_fields: "messages" }),
      },
    );
    if (subscription.success !== true)
      throw new ConvexError("Instagram messaging subscription failed.");
    const tokenExpiresAt = Date.now() + long.expires_in * 1_000;
    await ctx.runMutation(internal.ai.connections.completeOAuth, {
      orgId,
      userId: pending.userId,
      version: pending.version,
      accountId,
      username: profile.username,
      tokenCiphertext: encryptToken(long.access_token),
      tokenExpiresAt,
    });
    await ctx.scheduler.runAfter(
      45 * 86_400_000,
      internal.ai.instagram.refreshConnection,
      { orgId, tokenExpiresAt },
    );
  },
});

export const refreshConnection = internalAction({
  args: {
    orgId: v.id("orgs"),
    tokenExpiresAt: v.number(),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(internal.ai.connections.getInternal, {
      orgId: args.orgId,
    });
    if (
      !connection?.tokenCiphertext ||
      connection.status !== "connected" ||
      connection.tokenExpiresAt !== args.tokenExpiresAt
    )
      return;
    try {
      const url = new URL("https://graph.instagram.com/refresh_access_token");
      url.search = new URLSearchParams({
        grant_type: "ig_refresh_token",
        access_token: decryptToken(connection.tokenCiphertext),
      }).toString();
      const data = await jsonRequest(url.toString());
      if (
        typeof data.access_token !== "string" ||
        typeof data.expires_in !== "number" ||
        data.expires_in <= 0
      )
        throw new Error("Invalid refreshed token");
      const tokenExpiresAt = Date.now() + data.expires_in * 1_000;
      const saved = await ctx.runMutation(
        internal.ai.connections.refreshToken,
        {
          orgId: args.orgId,
          previousCiphertext: connection.tokenCiphertext,
          tokenCiphertext: encryptToken(data.access_token),
          tokenExpiresAt,
        },
      );
      if (saved)
        await ctx.scheduler.runAfter(
          45 * 86_400_000,
          internal.ai.instagram.refreshConnection,
          { orgId: args.orgId, tokenExpiresAt },
        );
    } catch {
      const retryDelays = [60_000, 10 * 60_000, 60 * 60_000];
      const attempt = args.attempt ?? 0;
      const delay = retryDelays[attempt];
      if (delay && args.tokenExpiresAt > Date.now() + delay + 60_000) {
        await ctx.scheduler.runAfter(
          delay,
          internal.ai.instagram.refreshConnection,
          {
            ...args,
            attempt: attempt + 1,
          },
        );
        return;
      }
      await ctx.runMutation(internal.ai.connections.flagError, {
        orgId: args.orgId,
        previousCiphertext: connection.tokenCiphertext,
      });
    }
  },
});

export const sendMessage = internalAction({
  args: { orgId: v.id("orgs"), messageId: v.id("ai_messages") },
  handler: async (ctx, args) => {
    const send = await ctx.runMutation(internal.ai.delivery.claim, args);
    if (!send) return;
    let requested = false;
    try {
      const token = decryptToken(send.tokenCiphertext);
      const url = graphUrl(`${send.accountId}/messages`);
      requested = true;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: { id: send.recipientId },
          message: { text: send.content },
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const data = await response.json();
      if (!response.ok || typeof data.message_id !== "string") {
        if (data?.error?.code === 190)
          await ctx.runMutation(internal.ai.connections.flagError, {
            orgId: args.orgId,
            previousCiphertext: send.tokenCiphertext,
          });
        await ctx.runMutation(internal.ai.delivery.complete, {
          ...args,
          status:
            response.status >= 500 || response.ok ? "uncertain" : "failed",
          error:
            "Instagram did not confirm this reply. Check the conversation before sending again.",
        });
        return;
      }
      await ctx.runMutation(internal.ai.delivery.complete, {
        ...args,
        status: "sent",
        providerMessageId: data.message_id,
      });
    } catch {
      // A timeout can occur AFTER Meta accepted a message. Blind retries would
      // duplicate it. Echo reconciliation can later establish acceptance.
      await ctx.runMutation(internal.ai.delivery.complete, {
        ...args,
        status: requested ? "uncertain" : "failed",
        error: "Unable to confirm delivery. Check Instagram before replying.",
      });
    }
  },
});
