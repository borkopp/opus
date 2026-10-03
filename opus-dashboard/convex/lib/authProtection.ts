import {
  AUTH_CAPTCHA_ACTION,
  AUTH_CLIENT_IP_HEADER,
  AUTH_PROXY_HEADERS,
  captchaRequired,
  isLocalAuthSite,
  isOtpSendRequest,
  needsTrustedAuthProxy,
  verifyAuthProxyRequest,
} from "../../lib/auth-protection";

function securityError(status: number, code: string, message: string) {
  return Response.json(
    { code, message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

// Runs BEFORE Better Auth's limiter, so an attacker cannot choose their IP bucket.
export async function authenticateAuthProxy(request: Request, siteUrl: string) {
  const headers = new Headers(request.headers);
  headers.delete(AUTH_CLIENT_IP_HEADER);
  if (isLocalAuthSite(siteUrl)) {
    headers.set(
      AUTH_CLIENT_IP_HEADER,
      request.headers.get("x-forwarded-for") ?? "127.0.0.1",
    );
    return new Request(request, { headers });
  }
  const signed = headers.has(AUTH_PROXY_HEADERS.signature);
  if (signed || needsTrustedAuthProxy(request)) {
    const secret = process.env.AUTH_PROXY_SECRET?.trim();
    if (!secret || secret.length < 32)
      return securityError(
        503,
        "AUTH_SECURITY_UNAVAILABLE",
        "Sign-in is temporarily unavailable. Please try again later.",
      );
    try {
      if (!(await verifyAuthProxyRequest(request, secret)))
        return securityError(
          403,
          "AUTH_PROXY_REQUIRED",
          "Please request your code through the OPUS sign-in page.",
        );
    } catch {
      return securityError(
        403,
        "AUTH_PROXY_REQUIRED",
        "Please request your code through the OPUS sign-in page.",
      );
    }
    headers.set(
      AUTH_CLIENT_IP_HEADER,
      headers.get(AUTH_PROXY_HEADERS.ip) ?? "",
    );
  } else {
    // Unsigned session reads remain available to the separate owner app.
    for (const header of Object.values(AUTH_PROXY_HEADERS))
      headers.delete(header);
  }
  return new Request(request, { headers });
}

// Called by the plugin AFTER the IP rate limiter and BEFORE any email is sent.
export async function verifyAuthCaptcha(request: Request, siteUrl: string) {
  if (
    isLocalAuthSite(siteUrl) ||
    !isOtpSendRequest(request) ||
    !captchaRequired(request.headers.get(AUTH_PROXY_HEADERS.country))
  )
    return;
  const token = request.headers.get("x-captcha-response");
  if (!token || token.length > 2048)
    return securityError(
      400,
      "CAPTCHA_REQUIRED",
      "Complete the security check to request a code.",
    );
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret)
    return securityError(
      503,
      "AUTH_SECURITY_UNAVAILABLE",
      "Sign-in is temporarily unavailable. Please try again later.",
    );
  const hostname = request.headers.get(AUTH_PROXY_HEADERS.hostname);
  const body = new URLSearchParams({ secret, response: token });
  const ip = request.headers.get(AUTH_CLIENT_IP_HEADER);
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        signal: AbortSignal.timeout(8000),
      },
    );
    const result: { success?: boolean; hostname?: string; action?: string } =
      await response.json();
    if (
      !response.ok ||
      result.success !== true ||
      !hostname ||
      result.hostname !== hostname ||
      result.action !== AUTH_CAPTCHA_ACTION
    ) {
      return securityError(
        400,
        "CAPTCHA_INVALID",
        "The security check expired or failed. Please try again.",
      );
    }
  } catch {
    return securityError(
      503,
      "AUTH_SECURITY_UNAVAILABLE",
      "The security check is unavailable. Please try again later.",
    );
  }
}
