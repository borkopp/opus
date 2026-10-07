import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { emailOTP } from "better-auth/plugins/email-otp";
import { expo } from "@better-auth/expo";
import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import {
  deliverEmail,
  emailFromForRoute,
  providerOrderForRoute,
} from "./lib/emailDelivery";
import { renderAccountOtpEmail } from "./lib/emailTemplates";
import { authenticateAuthProxy, verifyAuthCaptcha } from "./lib/authProtection";
import { AUTH_CLIENT_IP_HEADER } from "../lib/auth-protection";
import { appReviewOtp, isAppReviewEmail } from "./lib/appReview";

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
      "opus-studio://",
      ...(process.env.AUTH_MOBILE_WEB_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
      ...(isLocalUrl(siteUrl)
        ? [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:3002",
            "http://127.0.0.1:3002",
            "http://localhost:8081",
            "http://127.0.0.1:8081",
            "exp://**",
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

  const rendered = renderAccountOtpEmail({ otp, type });
  await deliverEmail(
    {
      from: emailFromForRoute("auth"),
      to: email,
      ...rendered,
      idempotencyKey: `opus-auth/${crypto.randomUUID()}`,
      tags: [{ name: "category", value: "auth_otp" }],
    },
    { providers: providerOrderForRoute("auth"), route: "auth" },
  );
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

  const auth = betterAuth({
    appName: "OPUS",
    baseURL: siteUrl,
    secret: getAuthSecret(),
    trustedOrigins: getTrustedOrigins(siteUrl),
    database: authComponent.adapter(ctx),
    // Rolling host-scoped sessions let clients reuse one verified sign-in.
    // Keep the existing cookie name, signing secret, and studio origin.
    session: { expiresIn: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
    advanced: { ipAddress: { ipAddressHeaders: [AUTH_CLIENT_IP_HEADER] } },
    rateLimit: {
      // Convex does not set NODE_ENV=production. Never rely on that default.
      enabled: true,
      storage: "database",
      customRules: {
        "/email-otp/send-verification-otp": { window: 60, max: 3 },
        "/sign-in/email-otp": { window: 60, max: 5 },
      },
    },
    plugins: [
      expo(),
      {
        id: "opus-auth-captcha",
        onRequest: async (request) => {
          const response = await verifyAuthCaptcha(request, siteUrl);
          return response ? { response } : undefined;
        },
      },
      emailOTP({
        allowedAttempts: 5,
        expiresIn: 300,
        storeOTP: "hashed",
        generateOTP: ({ email, type }) => {
          if (isAppReviewEmail(email)) {
            const otp = type === "sign-in" ? appReviewOtp() : undefined;
            if (!otp) throw new Error("App review access is unavailable.");
            return otp;
          }
          // Returning undefined preserves Better Auth's cryptographic generator.
          return testOtp;
        },
        async sendVerificationOTP({ email, otp, type }) {
          if (isAppReviewEmail(email)) {
            if (
              type !== "sign-in" ||
              !appReviewOtp() ||
              !(await ctx.runQuery(internal.appReview.signInAvailable, {}))
            )
              throw new Error("App review access is unavailable.");
            return; // Only this pre-provisioned, isolated reviewer receives no email.
          }
          await deliverOtp({ email, otp, type, siteUrl });
        },
      }),
      convex({ authConfig }),
    ],
  });
  return {
    ...auth,
    handler: async (request: Request) => {
      const secured = await authenticateAuthProxy(request, siteUrl);
      if (secured instanceof Response) return secured;
      if (secured.method === "POST") {
        const body = await secured
          .clone()
          .json()
          .catch(() => null);
        if (
          body &&
          typeof body.email === "string" &&
          isAppReviewEmail(body.email)
        ) {
          const path = new URL(secured.url).pathname;
          const validPath =
            path.endsWith("/sign-in/email-otp") ||
            (path.endsWith("/email-otp/send-verification-otp") &&
              body.type === "sign-in");
          if (
            !validPath ||
            !(await ctx.runQuery(internal.appReview.signInAvailable, {}))
          )
            return Response.json(
              { message: "App review access is unavailable." },
              { status: 403 },
            );
        }
      }
      return auth.handler(secured);
    },
  };
};
