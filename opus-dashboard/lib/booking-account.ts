import { ConvexHttpClient } from "convex/browser";
import type { FunctionArgs } from "convex/server";
import { api } from "../convex/_generated/api";
import { authClient } from "./auth-client";
import { AccountLinkError } from "./account-errors";

export async function requestBookingAccountCode(
  email: string,
  captchaToken: string | null,
) {
  const result = await authClient.emailOtp.sendVerificationOtp(
    { email, type: "sign-in" },
    {
      headers: captchaToken
        ? { "x-captcha-response": captchaToken }
        : undefined,
    },
  );
  if (result.error)
    throw new AccountLinkError(
      result.error.message || "Could not send a verification code.",
    );
  return { expiresAt: Date.now() + 300_000, resendAfter: Date.now() + 60_000 };
}

/** The verified sign-in sets the remembered cookie; it creates no staff membership. */
export async function verifyBookingAccountCode(
  email: string,
  otp: string,
  name: string,
) {
  const result = await authClient.signIn.emailOtp({ email, otp, name });
  if (result.error || !result.data?.user)
    throw new AccountLinkError(
      result.error?.message || "The verification code is invalid or expired.",
    );
}

/** Fetch the new session's token immediately instead of racing React's auth subscription. */
export async function completeAccountBooking(
  args: FunctionArgs<typeof api.publicBooking.createAccountBooking>,
) {
  const result = await authClient.convex.token();
  if (result.error || !result.data?.token)
    throw new AccountLinkError(
      "Your account is signed in, but the appointment could not be confirmed. Try again.",
    );
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  client.setAuth(result.data.token);
  return client.mutation(api.publicBooking.createAccountBooking, args);
}
