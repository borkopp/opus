import { handler } from "@/lib/auth-server";
import { needsTrustedAuthProxy } from "@/lib/auth-protection";
import { withAuthProxyProof } from "@/lib/auth-proxy";

export async function GET(request: Request) {
  // Give session reads their own verified IP bucket once the proxy is configured.
  return handler.GET(
    process.env.AUTH_PROXY_SECRET ? await withAuthProxyProof(request) : request,
  );
}

export async function POST(request: Request) {
  if (!needsTrustedAuthProxy(request) && !process.env.AUTH_PROXY_SECRET)
    return handler.POST(request);
  try {
    return await handler.POST(await withAuthProxyProof(request));
  } catch {
    return Response.json(
      {
        code: "AUTH_SECURITY_UNAVAILABLE",
        message: "Sign-in is temporarily unavailable. Please try again later.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
