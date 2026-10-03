import { authSecurityPolicy } from "@/lib/auth-proxy";

export function GET(request: Request) {
  return Response.json(authSecurityPolicy(request), {
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "x-vercel-ip-country",
    },
  });
}
