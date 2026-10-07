import { handler } from "@/lib/auth-server";
import { needsTrustedAuthProxy } from "@/lib/auth-protection";
import { withAuthProxyProof } from "@/lib/auth-proxy";
import {
  mobileAuthPreflight,
  mobileAuthResponse,
} from "@/lib/mobile-auth-cors";

export function OPTIONS(request: Request) {
  return mobileAuthPreflight(request) ?? new Response(null, { status: 204 });
}

export async function GET(request: Request) {
  const denied = mobileAuthPreflight(request);
  if (denied) return denied;
  // Give session reads their own verified IP bucket once the proxy is configured.
  return mobileAuthResponse(
    request,
    await handler.GET(
      process.env.AUTH_PROXY_SECRET
        ? await withAuthProxyProof(request)
        : request,
    ),
  );
}

export async function POST(request: Request) {
  const denied = mobileAuthPreflight(request);
  if (denied) return denied;
  if (!needsTrustedAuthProxy(request) && !process.env.AUTH_PROXY_SECRET)
    return mobileAuthResponse(request, await handler.POST(request));
  try {
    return mobileAuthResponse(
      request,
      await handler.POST(await withAuthProxyProof(request)),
    );
  } catch {
    return mobileAuthResponse(
      request,
      Response.json(
        {
          code: "AUTH_SECURITY_UNAVAILABLE",
          message:
            "Sign-in is temporarily unavailable. Please try again later.",
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      ),
    );
  }
}
