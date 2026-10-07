import { describe, expect, it } from "vitest";
import {
  resolveAccountAvatar,
  resolveAccountDisplayName,
  initials,
} from "../../lib/dashboard-overview";

describe("resolveAccountAvatar", () => {
  it("uses the staff avatar if the staff member has a profile picture", () => {
    const avatar = resolveAccountAvatar({
      staffAvatarUrl: "https://storage.opus.mk/staff-photo.jpg",
      user: { avatarUrl: "https://lh3.google.com/user.jpg" },
      orgLogoUrl: "https://storage.opus.mk/salon-logo.png",
    });

    expect(avatar).toEqual({
      src: "https://storage.opus.mk/staff-photo.jpg",
      isFallbackToLogo: false,
    });
  });

  it("uses the user account avatar if staff has no specific photo", () => {
    const avatar = resolveAccountAvatar({
      staffAvatarUrl: undefined,
      user: { avatarUrl: "https://lh3.google.com/user.jpg" },
      orgLogoUrl: "https://storage.opus.mk/salon-logo.png",
    });

    expect(avatar).toEqual({
      src: "https://lh3.google.com/user.jpg",
      isFallbackToLogo: false,
    });
  });

  it("falls back to the salon logo if user/staff has no profile picture", () => {
    const avatar = resolveAccountAvatar({
      staffAvatarUrl: undefined,
      user: { avatarUrl: undefined },
      orgLogoUrl: "https://storage.opus.mk/salon-logo.png",
    });

    expect(avatar).toEqual({
      src: "https://storage.opus.mk/salon-logo.png",
      isFallbackToLogo: true,
    });
  });

  it("treats whitespace-only avatar strings as empty and falls back to salon logo", () => {
    const avatar = resolveAccountAvatar({
      staffAvatarUrl: "   ",
      user: { avatarUrl: "" },
      orgLogoUrl: "https://storage.opus.mk/salon-logo.png",
    });

    expect(avatar).toEqual({
      src: "https://storage.opus.mk/salon-logo.png",
      isFallbackToLogo: true,
    });
  });

  it("returns null if neither user/staff nor salon has a picture/logo", () => {
    const avatar = resolveAccountAvatar({
      staffAvatarUrl: undefined,
      user: { avatarUrl: undefined },
      orgLogoUrl: undefined,
    });

    expect(avatar).toEqual({
      src: null,
      isFallbackToLogo: false,
    });
    expect(initials("Borko Petrevski")).toBe("BP");
  });
});

describe("resolveAccountDisplayName", () => {
  it("prioritizes staffDisplayName set in Staff settings over user.name", () => {
    const name = resolveAccountDisplayName({
      staffDisplayName: "Borko Hair Studio",
      user: { name: "borko petrevski" },
    });
    expect(name).toBe("Borko Hair Studio");
  });

  it("falls back to user.name if staffDisplayName is not present", () => {
    const name = resolveAccountDisplayName({
      staffDisplayName: undefined,
      user: { name: "borko petrevski" },
    });
    expect(name).toBe("borko petrevski");
  });

  it("treats whitespace-only staffDisplayName as empty and falls back to user.name", () => {
    const name = resolveAccountDisplayName({
      staffDisplayName: "   ",
      user: { name: "borko petrevski" },
    });
    expect(name).toBe("borko petrevski");
  });

  it("returns null if neither is present", () => {
    const name = resolveAccountDisplayName({
      staffDisplayName: undefined,
      user: null,
    });
    expect(name).toBeNull();
  });
});
