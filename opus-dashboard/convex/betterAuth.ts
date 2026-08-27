import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins/email-otp";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

export const authComponent = createClient<DataModel>(components.betterAuth);

function getSiteUrl() {
  const value = process.env.SITE_URL?.trim();
  if (!value) {
    throw new Error("SITE_URL is required for Better Auth.");
  }
  return value.replace(/\/$/, "");
}

function getAuthSecret() {
  const value = process.env.BETTER_AUTH_SECRET?.trim();
  if (!value) {
    throw new Error("BETTER_AUTH_SECRET is required for Better Auth.");
  }
  return value;
}

function isLocalUrl(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getTrustedOrigins(siteUrl: string) {
  const configured = (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return Array.from(
    new Set([
      siteUrl,
      ...(isLocalUrl(siteUrl)
        ? [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
          ]
        : []),
      ...configured,
    ]),
  );
}

async function deliverOtp({
  email,
  otp,
  type,
  siteUrl,
}: {
  email: string;
  otp: string;
  type: "sign-in" | "email-verification" | "forget-password" | "change-email";
  siteUrl: string;
}) {
  const emailMode = process.env.AUTH_EMAIL_MODE?.trim().toLowerCase();
  const localDelivery = isLocalUrl(siteUrl);

  if (emailMode === "console" && !localDelivery) {
    throw new Error(
      "Console OTP delivery is only allowed for local Better Auth sites.",
    );
  }

  if (localDelivery && (!emailMode || emailMode === "console")) {
    console.info(`[OPUS auth] ${type} OTP for ${email}: ${otp}`);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "Email OTP delivery is not configured. Set RESEND_API_KEY and AUTH_EMAIL_FROM.",
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your OPUS sign-in code",
      text: `Your OPUS sign-in code is ${otp}. It expires in 5 minutes.`,
      html: `<p>Your OPUS sign-in code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Email OTP delivery failed with status ${response.status}.`,
    );
  }
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = getSiteUrl();
  const configuredTestOtp = process.env.AUTH_TEST_OTP?.trim();
  if (configuredTestOtp && !isLocalUrl(siteUrl)) {
    throw new Error(
      "AUTH_TEST_OTP is only allowed for local Better Auth sites.",
    );
  }
  if (configuredTestOtp && !/^\d{6}$/.test(configuredTestOtp)) {
    throw new Error("AUTH_TEST_OTP must be exactly six digits.");
  }
  const testOtp =
    isLocalUrl(siteUrl) && configuredTestOtp ? configuredTestOtp : undefined;

  return betterAuth({
    appName: "OPUS",
    baseURL: siteUrl,
    secret: getAuthSecret(),
    trustedOrigins: getTrustedOrigins(siteUrl),
    database: authComponent.adapter(ctx),
    rateLimit: {
      storage: "database",
    },
    plugins: [
      emailOTP({
        allowedAttempts: 5,
        expiresIn: 300,
        storeOTP: "hashed",
        ...(testOtp ? { generateOTP: () => testOtp } : {}),
        async sendVerificationOTP({ email, otp, type }) {
          await deliverOtp({ email, otp, type, siteUrl });
        },
      }),
      convex({ authConfig }),
    ],
  });
};
