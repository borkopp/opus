import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const { fetchAuthQuery } = vi.hoisted(() => ({ fetchAuthQuery: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ fetchAuthQuery }));
vi.mock("@/lib/api", () => ({
  ownerAccess: "access",
  ownerActivity: "activity",
}));
vi.mock("@/lib/auth-policy", async () => await import("../lib/auth-policy"));
import { POST } from "../app/api/activity/route";

function request(
  body: unknown = {
    orgId: "studio",
    kind: "bookings",
    status: "all",
    cursor: null,
  },
  origin = "http://localhost:3002",
) {
  return new Request("http://localhost:3002/api/activity", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  fetchAuthQuery.mockReset();
  vi.stubEnv("OWNER_SITE_URL", "http://localhost:3002");
});
afterEach(() => vi.unstubAllEnvs());

describe("private activity route", () => {
  test("rejects foreign origins without reading account data", async () => {
    expect(
      (await POST(request(undefined, "https://foreign.example"))).status,
    ).toBe(403);
    expect(fetchAuthQuery).not.toHaveBeenCalled();
  });
  test("requires owner access before returning data", async () => {
    fetchAuthQuery.mockRejectedValue(new Error("Unauthorized"));
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(fetchAuthQuery).toHaveBeenCalledTimes(1);
  });
  test.each([
    { orgId: "studio", kind: "unknown", status: "all", cursor: null },
    { orgId: "studio", kind: "team", status: "all", cursor: 42 },
    null,
  ])("rejects malformed selectors", async (body) => {
    fetchAuthQuery.mockResolvedValue({ email: "owner@example.com" });
    expect((await POST(request(body))).status).toBe(400);
    expect(fetchAuthQuery).toHaveBeenCalledTimes(1);
  });
  test("returns only authenticated query results with private caching", async () => {
    fetchAuthQuery
      .mockResolvedValueOnce({ email: "owner@example.com" })
      .mockResolvedValueOnce({ bookings: [], kind: "bookings" });
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ bookings: [], kind: "bookings" });
    expect(fetchAuthQuery).toHaveBeenLastCalledWith("activity", {
      orgId: "studio",
      kind: "bookings",
      status: "all",
      cursor: null,
    });
  });
  test("signals expiry instead of retaining private data on query failure", async () => {
    fetchAuthQuery
      .mockResolvedValueOnce({ email: "owner@example.com" })
      .mockRejectedValueOnce(new Error("Expired"))
      .mockRejectedValueOnce(new Error("Expired"));
    expect((await POST(request())).status).toBe(401);
  });
  test("reports transient backend failure for a still-valid owner", async () => {
    fetchAuthQuery
      .mockResolvedValueOnce({ email: "owner@example.com" })
      .mockRejectedValueOnce(new Error("Failed"))
      .mockResolvedValueOnce({ email: "owner@example.com" });
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
