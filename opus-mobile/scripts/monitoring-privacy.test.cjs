const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  diagnosticRoute, sanitizeDiagnosticEvent, sanitizeDiagnosticSpan,
} = require("../src/lib/monitoring-privacy.ts");

test("crash diagnostics retain their stack and release while excluding client and auth content", () => {
  const event = {
    event_id: "a".repeat(32), release: "mk.opus.studio@1.0.2+8", dist: "8",
    user: { id: "private-account", email: "client@example.com", name: "Ana" },
    request: { url: "https://studio.opus.mk/api/auth?code=123456", data: "secret" },
    extra: { client: { name: "Ana", notes: "Private note" }, pushToken: "private-push" },
    message: "Appointment for Ana failed",
    logentry: { message: "client@example.com", params: ["private-token"] },
    breadcrumbs: [{ category: "console", message: "Private note" }],
    tags: { "monitoring-area": "render", "expo-update-id": "embedded", client: "Ana" },
    contexts: {
      app: { app_identifier: "mk.opus.studio", app_version: "1.0.2" },
      device: { model: "iPhone17,3", name: "Ana's phone", id: "private-device" },
      os: { name: "iOS", version: "26.5" },
      studio: { name: "Private studio", customers: ["Ana"] },
      trace: { trace_id: "b".repeat(32), span_id: "c".repeat(16), data: { token: "private-token" } },
    },
    exception: { values: [{ type: "TypeError", value: "Could not save Ana client@example.com",
      mechanism: { type: "generic", handled: false, data: { body: "Private note" }, meta: { request: "private-token" } },
      stacktrace: { frames: [{ filename: "app:///index.js?token=private-token", function: "saveAppointment",
        lineno: 42, colno: 6, vars: { token: "private-token" }, context_line: "Private note", data: { body: "Private note" } }] },
    }] },
  };
  const result = sanitizeDiagnosticEvent(event);
  assert.equal(result.release, event.release);
  assert.equal(result.exception.values[0].type, "TypeError");
  assert.equal(result.exception.values[0].stacktrace.frames[0].lineno, 42);
  assert.equal(result.exception.values[0].stacktrace.frames[0].filename, "app:///index.js");
  assert.equal(result.contexts.device.model, "iPhone17,3");
  assert.equal(result.contexts.trace.trace_id, "b".repeat(32));
  assert.equal(result.tags["monitoring-area"], "render");
  const payload = JSON.stringify(result);
  for (const forbidden of ["Ana", "client@example.com", "123456", "secret", "Private note",
    "private-account", "private-push", "private-device", "private-token", "Private studio"])
    assert(!payload.includes(forbidden), `Leaked ${forbidden}`);
});

test("performance events preserve timings while removing route IDs and request payloads", () => {
  const event = {
    type: "transaction", transaction: "appointment/private-booking?token=secret",
    start_timestamp: 100, timestamp: 100.3,
    measurements: { "frames.slow": { value: 2, unit: "none" } },
    spans: [{ trace_id: "a".repeat(32), span_id: "b".repeat(16),
      start_timestamp: 100.1, timestamp: 100.2, op: "navigation",
      description: "client/private-customer?email=client@example.com",
      data: { "route.params": { name: "Ana" }, url: "https://example.com?token=secret" },
    }],
  };
  const result = sanitizeDiagnosticEvent(event);
  assert.equal(result.transaction, "appointment/[id]");
  assert.equal(result.spans[0].description, "client/[id]");
  assert.equal(result.timestamp, 100.3);
  assert.equal(result.measurements["frames.slow"].value, 2);
  assert.equal(result.spans[0].timestamp, 100.2);
  assert.deepEqual(result.spans[0].data, {});
  const http = sanitizeDiagnosticSpan({ op: "http.client", description: "https://private.example/client/Ana",
    data: { url: "https://private.example", body: "Private note" } });
  assert.equal(http.description, "application");
  assert.deepEqual(http.data, {});
});

test("only known route templates are retained as diagnostic names", () => {
  assert.equal(diagnosticRoute("(tabs)/calendar"), "(tabs)/calendar");
  assert.equal(diagnosticRoute("service/[id]"), "service/[id]");
  assert.equal(diagnosticRoute("/team/private-staff"), "team/[id]");
  for (const value of [undefined, "Ana", "https://example.com?otp=123456", "private/studio"])
    assert.equal(diagnosticRoute(value), "application");
});
