import { authSecurityPolicy } from "@/lib/auth-proxy";
import {
  mobileAuthPreflight,
  mobileAuthResponse,
} from "@/lib/mobile-auth-cors";

export function OPTIONS(request: Request) {
  return mobileAuthPreflight(request) ?? new Response(null, { status: 204 });
}

export function GET(request: Request) {
  const denied = mobileAuthPreflight(request);
  if (denied) return denied;
  return mobileAuthResponse(
    request,
    Response.json(authSecurityPolicy(request), {
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "x-vercel-ip-country",
      },
    }),
  );
}
