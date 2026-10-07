import { ConvexError } from "convex/values";

/** Locally prepared guidance that is safe to display to the account holder. */
export class AccountLinkError extends Error {}

export function accountErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ConvexError && typeof error.data === "string")
    return error.data;
  if (error instanceof AccountLinkError) return error.message;
  return fallback;
}
