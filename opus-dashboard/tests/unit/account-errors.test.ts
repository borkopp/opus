import { expect, it } from "vitest";
import { ConvexError } from "convex/values";
import {
  AccountLinkError,
  accountErrorMessage,
} from "../../lib/account-errors";

it("shows public account guidance and hides internal stack traces", () => {
  expect(
    accountErrorMessage(
      new ConvexError("Sign in with the invited email."),
      "Try again",
    ),
  ).toBe("Sign in with the invited email.");
  expect(
    accountErrorMessage(
      new AccountLinkError("Open the complete confirmation link."),
      "Try again",
    ),
  ).toBe("Open the complete confirmation link.");
  expect(
    accountErrorMessage(
      new Error("[CONVEX mutation] Internal file and stack trace"),
      "Try again",
    ),
  ).toBe("Try again");
});
