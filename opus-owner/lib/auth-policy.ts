import { isOwnerEmail } from "../../shared/owner-access";

export function allowedAuthRequest(
  path: string,
  body: Record<string, unknown>,
) {
  if (path === "/api/auth/sign-out") return true;
  if (!isOwnerEmail(body.email)) return false;
  if (path === "/api/auth/email-otp/send-verification-otp")
    return body.type === "sign-in";
  if (path === "/api/auth/sign-in/email-otp")
    return typeof body.otp === "string" && /^\d{6}$/.test(body.otp);
  return false;
}

export function isSameOrigin(request: Request): boolean {
  const siteUrl = process.env.OWNER_SITE_URL;
  if (!siteUrl) return false;
  try {
    return request.headers.get("origin") === new URL(siteUrl).origin;
  } catch {
    return false;
  }
}
