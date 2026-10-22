import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ConvexError } from "convex/values";
const { fetchAuthQuery, fetchAuthMutation } = vi.hoisted(() => ({
  fetchAuthQuery: vi.fn(),
  fetchAuthMutation: vi.fn(),
}));
vi.mock("@/lib/auth-server", () => ({ fetchAuthQuery, fetchAuthMutation }));
vi.mock("@/lib/api", () => ({
  ownerAccess: "access",
  ownerAssistant: "allowance",
  updateOwnerAssistant: "update",
  prepareOwnerCleanup: "preview",
  executeOwnerCleanup: "delete",
}));
vi.mock("@/lib/auth-policy", async () => await import("../lib/auth-policy"));
import { POST } from "../app/api/controls/route";
const request = (body: unknown, origin = "http://localhost:3002") =>
  new Request("http://localhost:3002/api/controls", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  fetchAuthQuery.mockReset();
  fetchAuthMutation.mockReset();
  vi.stubEnv("OWNER_SITE_URL", "http://localhost:3002");
});
afterEach(() => vi.unstubAllEnvs());
describe("private owner controls route", () => {
  test("rejects foreign and missing origins before any backend work", async () => {
    for (const origin of ["https://foreign.example", ""])
      expect(
        (await POST(request({ orgId: "studio", action: "delete" }, origin)))
          .status,
      ).toBe(403);
    expect(fetchAuthQuery).not.toHaveBeenCalled();
    expect(fetchAuthMutation).not.toHaveBeenCalled();
  });
  test("requires owner access before any mutation", async () => {
    fetchAuthQuery.mockRejectedValue(new Error("Unauthorized"));
    expect(
      (await POST(request({ orgId: "studio", action: "previewDeletion" })))
        .status,
    ).toBe(401);
    expect(fetchAuthMutation).not.toHaveBeenCalled();
  });
  test.each([
    null,
    [],
    { orgId: "studio", action: "unknown" },
    { orgId: "studio", action: "delete" },
    {
      orgId: "studio",
      action: "setAllowance",
      operation: "custom",
      limit: 1,
      deepLimit: 2,
    },
    {
      orgId: "studio",
      action: "setAllowance",
      operation: "custom",
      limit: 10001,
      deepLimit: 0,
    },
    {
      orgId: "studio",
      action: "setAllowance",
      operation: "custom",
      limit: "5",
      deepLimit: 0,
    },
  ])("rejects malformed requests", async (body) => {
    fetchAuthQuery.mockResolvedValue({ email: "owner@example.com" });
    expect((await POST(request(body))).status).toBe(400);
    expect(fetchAuthMutation).not.toHaveBeenCalled();
  });
  test("passes only the selected studio, exact slug and server confirmation to deletion", async () => {
    fetchAuthQuery.mockResolvedValue({ email: "owner@example.com" });
    fetchAuthMutation.mockResolvedValue({ deleted: true });
    const response = await POST(
      request({
        orgId: "studio",
        action: "delete",
        confirmationId: "ticket",
        slug: "test-studio",
        tables: ["users"],
        owner: "fake",
        heldFor: 5000,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetchAuthMutation).toHaveBeenCalledWith("delete", {
      orgId: "studio",
      confirmationId: "ticket",
      slug: "test-studio",
    });
  });
  test("returns safe validation errors and clears the UI on session expiry", async () => {
    fetchAuthQuery.mockResolvedValue({ email: "owner@example.com" });
    fetchAuthMutation.mockRejectedValue(
      new ConvexError("Refresh this preview."),
    );
    const body = { orgId: "studio", action: "previewDeletion" };
    const response = await POST(request(body));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ message: "Refresh this preview." });
    fetchAuthQuery
      .mockReset()
      .mockResolvedValueOnce({ email: "owner@example.com" })
      .mockRejectedValue(new Error("Expired"));
    expect((await POST(request(body))).status).toBe(401);
  });
  test("does not expose internal backend errors", async () => {
    fetchAuthQuery.mockResolvedValue({ email: "owner@example.com" });
    fetchAuthMutation.mockRejectedValue(new Error("secret provider detail"));
    const response = await POST(
      request({ orgId: "studio", action: "setAllowance", operation: "reset" }),
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("secret");
  });
});
