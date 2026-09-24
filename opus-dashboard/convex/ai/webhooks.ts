import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { parseInstagramEvents } from "./rules";

export async function validInstagramSignature(
  raw: string,
  signature: string | null,
  secret: string | undefined,
) {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/i.test(signature))
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(signature.slice(7).match(/.{2}/g)!, (part) =>
    parseInt(part, 16),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(raw),
  );
}

export const verify = httpAction(async (_ctx, request) => {
  const params = new URL(request.url).searchParams;
  const token = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  if (
    !token ||
    params.get("hub.mode") !== "subscribe" ||
    params.get("hub.verify_token") !== token ||
    !params.has("hub.challenge")
  )
    return new Response("Forbidden", { status: 403 });
  return new Response(params.get("hub.challenge"), {
    headers: { "Content-Type": "text/plain" },
  });
});

export const receive = httpAction(async (ctx, request) => {
  const raw = await request.text();
  if (raw.length > 512_000)
    return new Response("Payload too large", { status: 413 });
  if (
    !(await validInstagramSignature(
      raw,
      request.headers.get("x-hub-signature-256"),
      process.env.INSTAGRAM_APP_SECRET,
    ))
  )
    return new Response("Invalid signature", { status: 401 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  // Await durable mutations before acknowledging Meta. Each mutation inserts a
  // deduplicated message and schedules processing atomically; no detached work.
  for (const event of parseInstagramEvents(body))
    await ctx.runMutation(internal.ai.queue.ingest, event);
  return new Response("ok");
});

export const callback = httpAction(async (ctx, request) => {
  const params = new URL(request.url).searchParams;
  const destination = new URL(
    "/settings?tab=ai",
    process.env.SITE_URL ?? "https://studio.opus.mk",
  );
  try {
    if (params.has("error") || !params.get("code") || !params.get("state"))
      throw new Error("Instagram authorization was not completed");
    await ctx.runAction(internal.ai.instagram.finishConnection, {
      code: params.get("code")!,
      state: params.get("state")!,
    });
    destination.searchParams.set("instagram", "connected");
  } catch {
    destination.searchParams.set("instagram", "error");
  }
  return new Response(null, {
    status: 303,
    headers: { Location: destination.toString(), "Cache-Control": "no-store" },
  });
});
