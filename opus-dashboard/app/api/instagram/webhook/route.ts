import { NextRequest } from "next/server";

// Preserve the former callback URL while existing Meta apps migrate to the
// Convex site URL. Forward the exact signed bytes and await durable ingestion.
async function forward(request: NextRequest) {
  const site = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!site)
    return new Response("Instagram webhook unavailable", { status: 503 });
  const url = new URL("/webhooks/instagram", site);
  url.search = request.nextUrl.search;
  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": request.headers.get("x-hub-signature-256") ?? "",
      },
      ...(request.method === "POST" ? { body: await request.text() } : {}),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return new Response("Retry later", { status: 503 });
  }
}
export const GET = forward;
export const POST = forward;
