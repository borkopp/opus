import { handler } from "@/lib/auth-server";
import { allowedAuthRequest, isSameOrigin } from "@/lib/auth-policy";
import { withAuthProxyProof } from "@/lib/auth-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ message: "Request not allowed." }, { status: 403 });
  const path = new URL(request.url).pathname;
  let body: unknown;
  try {
    body = await request.clone().json();
  } catch {
    return Response.json({ message: "Invalid request." }, { status: 400 });
  }
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !allowedAuthRequest(path, body as Record<string, unknown>)
  ) {
    return Response.json(
      { message: "This account cannot access the owner dashboard." },
      { status: 403 },
    );
  }
  // Better Auth still applies database-backed rate limits, five OTP attempts,
  // hashed single-use codes and the existing five-minute expiry.
  try {
    return await handler.POST(await withAuthProxyProof(request));
  } catch {
    return Response.json(
      {
        message: "Sign-in is temporarily unavailable. Please try again later.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
