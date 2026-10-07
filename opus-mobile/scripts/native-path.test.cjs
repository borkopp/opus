const { test } = require("node:test");
const assert = require("node:assert/strict");
const { safeNativePath } = require("../src/lib/native-path.ts");

test("preserves valid studio links, IDs, and Unicode query parameters", () => {
  for (const path of ["/client/client-id", "opus-studio://account/delete", "opus-studio://calendar?date=2026-10-05", "exp://localhost:8081/--/calendar", "opus-studio://calendar?label=%D0%A2%D0%B5%D1%80%D0%BC%D0%B8%D0%BD"])
    assert.equal(safeNativePath(path), path);
});
test("returns safely home for malformed encodings, oversized links and unsafe schemes", () => {
  for (const path of ["", "%", "/calendar?x=%FF", "/calendar?x=%C0%AF", "opus-studio://calendar?x=%".repeat(500), "javascript:alert(1)", "https://example.com/calendar", "/calendar\nmalformed"])
    assert.equal(safeNativePath(path), "/");
});
test("does not expose development-launcher URLs as user-facing routes", () => {
  assert.equal(safeNativePath("opus-studio://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"), "/");
});
