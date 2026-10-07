// Shared by the Next.js proxy and Convex. No provider keys belong in this file.
export const CAPTCHA_EXEMPT_COUNTRIES = new Set(["MK", "RS", "AL"]);
export const AUTH_CAPTCHA_ACTION = "auth-otp";
export const AUTH_PROXY_HEADERS = {
  country: "x-opus-auth-country",
  ip: "x-opus-auth-ip",
  hostname: "x-opus-auth-hostname",
  issuedAt: "x-opus-auth-issued-at",
  signature: "x-opus-auth-signature",
} as const;
export const AUTH_CLIENT_IP_HEADER = "x-opus-verified-client-ip";

export type AuthSecurityPolicy = {
  required: boolean;
  siteKey: string | null;
};

export function isLocalAuthSite(siteUrl: string) {
  const hostname = new URL(siteUrl).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export function captchaRequired(country: string | null) {
  return !CAPTCHA_EXEMPT_COUNTRIES.has(country ?? "");
}

export function authPath(request: Request) {
  // Match the auth router even when callers encode or duplicate slashes.
  return decodeURIComponent(new URL(request.url).pathname)
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .replace(/^\/api\/auth(?=\/|$)/, "");
}

export function isOtpSendRequest(request: Request) {
  return (
    request.method === "POST" &&
    [
      "/email-otp/send-verification-otp",
      "/email-otp/request-password-reset",
      "/forget-password/email-otp",
      "/email-otp/request-email-change",
      "/send-verification-email",
      "/request-password-reset",
    ].includes(authPath(request))
  );
}

export function needsTrustedAuthProxy(request: Request) {
  return (
    isOtpSendRequest(request) ||
    (request.method === "POST" && authPath(request) === "/sign-in/email-otp")
  );
}

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function proxyPayload(request: Request) {
  const body = await request.clone().arrayBuffer();
  if (body.byteLength > 16_384) throw new Error("Auth request is too large.");
  const url = new URL(request.url);
  const digest = toHex(await crypto.subtle.digest("SHA-256", body));
  return new TextEncoder().encode(
    JSON.stringify([
      "opus-auth-proxy-v1",
      request.method,
      url.pathname,
      url.search,
      digest,
      request.headers.get("x-captcha-response") ?? "",
      ...[
        AUTH_PROXY_HEADERS.country,
        AUTH_PROXY_HEADERS.ip,
        AUTH_PROXY_HEADERS.hostname,
        AUTH_PROXY_HEADERS.issuedAt,
      ].map((h) => request.headers.get(h) ?? ""),
    ]),
  );
}

async function proxyKey(secret: string) {
  if (secret.length < 32)
    throw new Error("AUTH_PROXY_SECRET must have at least 32 characters.");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signAuthProxyRequest(request: Request, secret: string) {
  return toHex(
    await crypto.subtle.sign(
      "HMAC",
      await proxyKey(secret),
      await proxyPayload(request),
    ),
  );
}

export async function verifyAuthProxyRequest(
  request: Request,
  secret: string,
  now = Date.now(),
) {
  const issuedAt = Number(request.headers.get(AUTH_PROXY_HEADERS.issuedAt));
  if (
    !Number.isSafeInteger(issuedAt) ||
    now - issuedAt > 60_000 ||
    issuedAt > now + 5_000
  )
    return false;
  const signature = request.headers.get(AUTH_PROXY_HEADERS.signature) ?? "";
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const bytes = Uint8Array.from(signature.match(/../g)!, (pair) =>
    parseInt(pair, 16),
  );
  return crypto.subtle.verify(
    "HMAC",
    await proxyKey(secret),
    bytes,
    await proxyPayload(request),
  );
}

export function authRequestLocation(request: Request) {
  // Only trust Vercel's edge headers when this function actually runs on Vercel.
  const onVercel = process.env.VERCEL === "1";
  const rawCountry = onVercel
    ? request.headers.get("x-vercel-ip-country")
    : null;
  const country =
    rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;
  const ip = onVercel
    ? (request.headers.get("x-vercel-forwarded-for")?.trim() ?? "")
    : "";
  let url = new URL(request.url);
  // Next's development server uses its bind address in Request.url. Resolve
  // the actual Host only for a local backend; production never trusts it here.
  if (
    !onVercel &&
    process.env.NODE_ENV !== "production" &&
    process.env.CONVEX_DEPLOYMENT?.startsWith("local:") &&
    url.hostname === "0.0.0.0"
  ) {
    const host = request.headers.get("host");
    if (host && !/[\s/\\?#@]/.test(host)) {
      try {
        url = new URL(`${url.protocol}//${host}`);
      } catch {
        // Invalid Host values retain the bind address and require verification.
      }
    }
  }
  const hostname = url.hostname;
  // A phone cannot use the host computer's loopback URL. Permit explicitly
  // configured private LAN origins only on a local Convex development setup.
  const octets = hostname.split(".").map(Number);
  const privateIp =
    octets.length === 4 &&
    octets.every(
      (part) => Number.isInteger(part) && part >= 0 && part <= 255,
    ) &&
    (octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168));
  const configuredLan =
    process.env.CONVEX_DEPLOYMENT?.startsWith("local:") &&
    url.protocol === "http:" &&
    privateIp &&
    (process.env.AUTH_LOCAL_MOBILE_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .includes(url.origin);
  const local =
    !onVercel &&
    process.env.NODE_ENV !== "production" &&
    (hostname === "localhost" || hostname === "127.0.0.1" || !!configuredLan);
  return { country, ip, hostname, local };
}

export function authSecurityPolicy(request: Request) {
  const location = authRequestLocation(request);
  return {
    required: !location.local && captchaRequired(location.country),
    siteKey: process.env.TURNSTILE_SITE_KEY?.trim() || null,
  };
}

export async function withAuthProxyProof(request: Request) {
  const location = authRequestLocation(request);
  const headers = new Headers(request.headers);
  for (const header of Object.values(AUTH_PROXY_HEADERS))
    headers.delete(header);
  headers.delete(AUTH_CLIENT_IP_HEADER);
  // Vercel's incoming Request can use a different implementation from the
  // global Request constructor. Materialize it instead of cloning across them.
  const forwarded = new Request(request.url, {
    method: request.method,
    headers,
    ...(request.method !== "GET" && request.method !== "HEAD"
      ? { body: await request.arrayBuffer() }
      : {}),
  });
  if (location.local) return forwarded;

  const secret = process.env.AUTH_PROXY_SECRET?.trim();
  if (!secret) throw new Error("AUTH_PROXY_SECRET is required.");
  headers.set(AUTH_PROXY_HEADERS.country, location.country ?? "");
  headers.set(AUTH_PROXY_HEADERS.ip, location.ip);
  headers.set(AUTH_PROXY_HEADERS.hostname, location.hostname);
  headers.set(AUTH_PROXY_HEADERS.issuedAt, String(Date.now()));
  headers.forEach((value, name) => forwarded.headers.set(name, value));
  headers.set(
    AUTH_PROXY_HEADERS.signature,
    await signAuthProxyRequest(forwarded, secret),
  );
  forwarded.headers.set(
    AUTH_PROXY_HEADERS.signature,
    headers.get(AUTH_PROXY_HEADERS.signature)!,
  );
  return forwarded;
}
