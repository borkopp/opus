import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";

const mock = vi.hoisted(() => ({
  send: vi.fn(),
  signIn: vi.fn(),
  token: vi.fn(),
  setAuth: vi.fn(),
  mutation: vi.fn(),
}));
vi.mock("../../lib/auth-client", () => ({
  authClient: {
    emailOtp: { sendVerificationOtp: mock.send },
    signIn: { emailOtp: mock.signIn },
    convex: { token: mock.token },
  },
}));
vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    setAuth = mock.setAuth;
    mutation = mock.mutation;
  },
}));
import {
  completeAccountBooking,
  requestBookingAccountCode,
  verifyBookingAccountCode,
} from "../../lib/booking-account";

const draft = {
  orgId: "studio" as Id<"orgs">,
  serviceId: "service" as Id<"services">,
  staffId: "staff" as Id<"staff_members">,
  startAt: 1791795600000,
  customerName: "Elena",
  customerPhone: "+38970222333",
};
describe("booking-time account verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.send.mockResolvedValue({ data: { success: true } });
    mock.signIn.mockResolvedValue({
      data: { user: { id: "verified-client" } },
    });
    mock.token.mockResolvedValue({ data: { token: "new-session-jwt" } });
    mock.mutation.mockResolvedValue({ bookingId: "appointment" });
  });
  it("uses one email code for sign-in, then books with the freshly verified session", async () => {
    const challenge = await requestBookingAccountCode(
      "elena@example.com",
      "captcha-proof",
    );
    expect(challenge.expiresAt).toBeGreaterThan(Date.now());
    expect(mock.send).toHaveBeenCalledWith(
      { email: "elena@example.com", type: "sign-in" },
      { headers: { "x-captcha-response": "captcha-proof" } },
    );
    await verifyBookingAccountCode("elena@example.com", "481516", "Elena");
    await completeAccountBooking(draft);
    expect(mock.signIn).toHaveBeenCalledTimes(1);
    expect(mock.setAuth).toHaveBeenCalledWith("new-session-jwt");
    expect(mock.mutation).toHaveBeenCalledWith(expect.anything(), draft);
    expect(mock.signIn.mock.invocationCallOrder[0]).toBeLessThan(
      mock.token.mock.invocationCallOrder[0],
    );
  });
  it("does not book or fetch a session token when email verification fails", async () => {
    mock.signIn.mockResolvedValue({ error: { message: "Invalid OTP" } });
    await expect(
      verifyBookingAccountCode("elena@example.com", "000000", "Elena"),
    ).rejects.toThrow("Invalid OTP");
    expect(mock.token).not.toHaveBeenCalled();
    expect(mock.mutation).not.toHaveBeenCalled();
  });
  it("never falls back to an anonymous booking when the new session is unavailable", async () => {
    mock.token.mockResolvedValue({ data: null });
    await expect(completeAccountBooking(draft)).rejects.toThrow(
      "account is signed in",
    );
    expect(mock.mutation).not.toHaveBeenCalled();
  });
  it("surfaces a taken slot without requesting another verification code", async () => {
    mock.mutation.mockRejectedValue(
      new Error("Time slot is no longer available"),
    );
    await expect(completeAccountBooking(draft)).rejects.toThrow(
      "no longer available",
    );
    expect(mock.send).not.toHaveBeenCalled();
    expect(mock.signIn).not.toHaveBeenCalled();
  });
});
