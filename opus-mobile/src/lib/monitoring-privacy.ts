import type { Event, ReactNativeOptions, StackFrame } from "@sentry/react-native";

type DiagnosticSpan = Parameters<
  NonNullable<ReactNativeOptions["beforeSendSpan"]>
>[0];

const routes = new Set([
  "(tabs)", "(tabs)/index", "(tabs)/calendar", "(tabs)/clients",
  "(tabs)/management", "(tabs)/settings", "index", "calendar", "clients",
  "management", "settings", "sign-in", "no-studio", "+not-found",
  "appointment/new", "appointment/[id]", "client/[id]", "service/[id]",
  "team/[id]", "notifications/preferences", "account/delete",
]);
const operations = new Set([
  "navigation", "ui.load", "ui.load.initial_display", "ui.load.full_display",
  "app.start.cold", "app.start.warm", "app.start", "ui.render", "ui.update",
  "resource", "resource.script", "function", "measure", "application",
]);
const diagnosticTags = new Set([
  "expo-update-id", "expo-is-embedded-update", "expo-update-channel",
  "expo-runtime-version", "native-runtime-signature", "monitoring-area",
  "event.origin", "event.environment",
]);

export function diagnosticRoute(value: unknown): string {
  if (typeof value !== "string") return "application";
  const route = value.replace(/^\//, "").split(/[?#]/, 1)[0];
  if (routes.has(route)) return route;
  // Dynamic IDs and query values never become transaction names.
  if (/^(appointment|client|service|team)\/[^/]+$/.test(route))
    return `${route.split("/")[0]}/[id]`;
  return "application";
}

function pickFields(
  source: Record<string, unknown> | undefined,
  keys: string[],
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "number" || typeof value === "boolean")
      result[key] = value;
    else if (typeof value === "string" && value.length <= 100)
      result[key] = value;
  }
  return result;
}

function diagnosticFrame(frame: StackFrame): StackFrame {
  // Use an allowlist so a future SDK field cannot carry local variables or
  // request content. Bundle paths stay intact for source-map resolution.
  return {
    filename: frame.filename?.split(/[?#]/, 1)[0],
    abs_path: frame.abs_path?.split(/[?#]/, 1)[0],
    function: frame.function,
    module: frame.module,
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
    platform: frame.platform,
    instruction_addr: frame.instruction_addr,
    addr_mode: frame.addr_mode,
  };
}

export function sanitizeDiagnosticSpan(span: DiagnosticSpan): DiagnosticSpan {
  const op = operations.has(span.op ?? "") ? span.op : "application";
  return {
    ...span,
    op,
    description: op === "navigation" || op?.startsWith("ui.load")
      ? diagnosticRoute(span.description)
      : op,
    data: pickFields(span.data, [
      "sentry.op", "sentry.origin", "sentry.source", "http.response.status_code",
      "thread.id", "thread.name", "app_start_type",
    ]),
  };
}

/**
 * Retain stack traces and timing measurements, not customer content. Native
 * events have their own SDK pipeline: native breadcrumbs/network collection
 * are also disabled in monitoring.ts and project-side scrubbing stays enabled.
 */
export function sanitizeDiagnosticEvent<T extends Event>(event: T): T {
  delete event.user;
  delete event.request;
  delete event.extra;
  delete event.breadcrumbs;
  delete event.logentry;
  delete event.fingerprint;
  if (event.message) event.message = "Unexpected application error";
  if (event.transaction) event.transaction = diagnosticRoute(event.transaction);
  if (event.transaction_info) event.transaction_info = { source: "route" };

  event.tags = Object.fromEntries(
    Object.entries(event.tags ?? {}).filter(([key]) => diagnosticTags.has(key)),
  );
  const contexts = event.contexts;
  event.contexts = {};
  if (contexts?.app)
    event.contexts.app = pickFields(contexts.app, [
      "app_identifier", "app_name", "app_version", "app_build", "in_foreground",
      "app_start_time",
    ]);
  if (contexts?.device)
    event.contexts.device = pickFields(contexts.device, [
      "manufacturer", "brand", "family", "model", "model_id", "arch",
      "memory_size", "free_memory", "screen_width_pixels", "screen_height_pixels",
      "screen_density", "screen_dpi", "orientation", "battery_level", "charging",
      "simulator", "low_memory",
    ]);
  if (contexts?.os)
    event.contexts.os = pickFields(contexts.os, [
      "name", "version", "build", "kernel_version", "rooted",
    ]);
  if (contexts?.runtime)
    event.contexts.runtime = pickFields(contexts.runtime, ["name", "version"]);
  if (contexts?.react_native_context)
    event.contexts.react_native_context = pickFields(contexts.react_native_context, [
      "react_native_version", "hermes_version", "hermes_debug_info", "turbo_module",
      "fabric", "react_native_js_engine", "js_engine",
    ]);
  if (contexts?.trace)
    event.contexts.trace = pickFields(contexts.trace, [
      "trace_id", "span_id", "parent_span_id", "op", "status", "origin",
    ]) as typeof contexts.trace;

  for (const exception of event.exception?.values ?? []) {
    // Error messages can contain customer names, notes or Convex payloads.
    // Stack frames and exception type identify the failing code without them.
    exception.value = "Unexpected application error";
    if (exception.mechanism) {
      const { type, handled, synthetic, exception_id, parent_id, is_exception_group } = exception.mechanism;
      exception.mechanism = { type, handled, synthetic, exception_id, parent_id, is_exception_group };
    }
    if (exception.stacktrace?.frames)
      exception.stacktrace.frames = exception.stacktrace.frames.map(diagnosticFrame);
  }
  for (const thread of event.threads?.values ?? []) {
    if (thread.stacktrace?.frames)
      thread.stacktrace.frames = thread.stacktrace.frames.map(diagnosticFrame);
  }
  if (event.spans) event.spans = event.spans.map(sanitizeDiagnosticSpan);
  return event;
}
