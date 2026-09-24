import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import proxy from "../../proxy";

afterEach(() => vi.unstubAllEnvs());

function request(path: string, host: string, forwardedHost?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: {
      host,
      ...(forwardedHost ? { "x-forwarded-host": forwardedHost } : {}),
    },
  });
}

describe("dashboard preview access", () => {
  it.each([
    "/dashboard-preview",
    "/dashboard-preview/",
    "/dashboard-preview?variant=studio",
    "/dashboard-preview/implementation",
    "/dashboard-preview/future/nested.page",
  ])("allows %s on localhost in development", (path) => {
    vi.stubEnv("NODE_ENV", "development");
    const response = proxy(request(path, "localhost:3000"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    "studio.opus.mk",
    "preview.vercel.app",
    "192.168.1.10:3000",
    "atelier.localhost:3000",
    "localhost.example.com:3000",
    "example.com:3000",
    "",
  ])("rejects a non-localhost Host: %s", (host) => {
    vi.stubEnv("NODE_ENV", "development");
    for (const path of [
      "/dashboard-preview",
      "/dashboard-preview/implementation",
    ]) {
      expect(proxy(request(path, host, "localhost:3000")).status).toBe(404);
    }
  });

  it.each(["production", "test"])("rejects localhost in %s", (environment) => {
    vi.stubEnv("NODE_ENV", environment);
    for (const path of [
      "/dashboard-preview",
      "/dashboard-preview/implementation",
    ]) {
      expect(proxy(request(path, "localhost:3000")).status).toBe(404);
    }
  });

  it("accepts localhost without a port", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(proxy(request("/dashboard-preview", "localhost")).status).toBe(200);
  });

  it("preserves the dashboard login redirect on public hosts", () => {
    vi.stubEnv("NODE_ENV", "development");
    const response = proxy(request("/beauty", "studio.opus.mk"));
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });
});
