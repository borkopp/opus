import { handler } from "@/lib/auth-server";
import { allowedAuthRequest, isSameOrigin } from "@/lib/auth-policy";

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
  return handler.POST(request);
}
