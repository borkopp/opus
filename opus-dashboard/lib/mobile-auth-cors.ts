// Native requests have no browser Origin. Expo web is enabled only for exact origins.
export function mobileWebOrigins() {
  return [
    ...(process.env.NODE_ENV !== "production"
      ? ["http://localhost:8081", "http://127.0.0.1:8081"]
      : []),
    ...(process.env.AUTH_MOBILE_WEB_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ];
}

export function mobileAuthPreflight(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    origin !== new URL(request.url).origin &&
    !mobileWebOrigins().includes(origin)
  )
    return Response.json(
      { message: "Origin is not allowed." },
      { status: 403 },
    );
  if (request.method === "OPTIONS")
    return mobileAuthResponse(request, new Response(null, { status: 204 }));
  return null;
}

export function mobileAuthResponse(request: Request, response: Response) {
  const headers = new Headers(response.headers);
  const origin = request.headers.get("origin");
  headers.append("Vary", "Origin");
  if (origin && mobileWebOrigins().includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, x-captcha-response, better-auth-cookie",
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
