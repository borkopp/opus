// Server-side regex extractor for time intent in marketplace queries.
//
// Embeddings will not filter closed shops on their own. We need a
// deterministic pre-pass to translate "now" / "tonight" / "tomorrow at 6pm"
// into a concrete timestamp in Europe/Skopje, before retrieval.
//
// Supported: "now", "tonight", "tomorrow"[+optional HH(:MM)?(am|pm)?],
// "today"[+optional time], "this evening", and bare HH:MM / Hpm forms.
// Anything else returns kind: "none" — no time-aware filtering applied.

const SKOPJE_TZ = "Europe/Skopje";

export type TimeIntent =
  | { kind: "now"; at: number }
  | { kind: "tonight"; at: number }
  | { kind: "tomorrow"; at: number }
  | { kind: "iso"; at: number }
  | { kind: "none" };

// Compute a target Date for "tonight" — defaults to 19:00 local.
// For "tomorrow" — defaults to noon local. These are rough
// anchors; the full availability check uses openingHours.
const TONIGHT_HOUR = 19;
const TOMORROW_HOUR = 12;
const NEXT_AVAILABLE_HOUR = 9;

// Build a timestamp by interpreting (yearOfDay, hour, minute) as
// Europe/Skopje local time. Uses the offset trick: format the same
// instant in Skopje, compute the offset, then subtract.
function tsInSkopje(year: number, month: number, day: number, hour: number, minute: number): number {
  // Naive UTC interpretation
  const utc = Date.UTC(year, month, day, hour, minute);
  // What Skopje thinks the time is at that UTC instant
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SKOPJE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(new Date(utc));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const tzAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  const offsetMs = tzAsUtc - utc;
  return utc - offsetMs;
}

function skopjeYMD(ts: number): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: SKOPJE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(new Date(ts));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { year: get("year"), month: get("month") - 1, day: get("day") };
}

function parseTimeFragment(text: string): { hour: number; minute: number } | undefined {
  // 12h: "6pm", "6 pm", "6:30pm"
  const ampm = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] ?? "0");
    const mod = ampm[3].toLowerCase();
    if (mod === "pm" && h < 12) h += 12;
    if (mod === "am" && h === 12) h = 0;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return { hour: h, minute: m };
  }
  // 24h: "18:30", "9:00"
  const hhmm = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (hhmm) {
    const h = Number(hhmm[1]);
    const m = Number(hhmm[2]);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) return { hour: h, minute: m };
  }
  return undefined;
}

export function extractTimeIntent(query: string, now: number = Date.now()): TimeIntent {
  const q = query.toLowerCase();
  const today = skopjeYMD(now);

  // "now" — only matches as a separate word
  if (/\bnow\b/.test(q) || /\bright now\b/.test(q) || /\bсега\b/.test(q)) {
    return { kind: "now", at: now };
  }

  // "tonight" / "this evening"
  if (/\btonight\b/.test(q) || /\bthis evening\b/.test(q) || /\bвечерва\b/.test(q) || /\bвечер\b/.test(q)) {
    const t = parseTimeFragment(q);
    const hour = t?.hour ?? TONIGHT_HOUR;
    const minute = t?.minute ?? 0;
    return {
      kind: "tonight",
      at: tsInSkopje(today.year, today.month, today.day, hour, minute),
    };
  }

  // "tomorrow"
  if (/\btomorrow\b/.test(q) || /\bутре\b/.test(q)) {
    const t = parseTimeFragment(q);
    const hour = t?.hour ?? TOMORROW_HOUR;
    const minute = t?.minute ?? 0;
    // Add ~24h then re-resolve YMD in Skopje, to be DST-safe.
    const next = skopjeYMD(now + 24 * 60 * 60 * 1000);
    return {
      kind: "tomorrow",
      at: tsInSkopje(next.year, next.month, next.day, hour, minute),
    };
  }

  // "today" + optional time
  if (/\btoday\b/.test(q) || /\bденес\b/.test(q)) {
    const t = parseTimeFragment(q);
    const hour = t?.hour ?? NEXT_AVAILABLE_HOUR;
    const minute = t?.minute ?? 0;
    return {
      kind: "iso",
      at: tsInSkopje(today.year, today.month, today.day, hour, minute),
    };
  }

  // Bare time on its own — assume today if future, otherwise tomorrow
  const bare = parseTimeFragment(q);
  if (bare) {
    const candidate = tsInSkopje(today.year, today.month, today.day, bare.hour, bare.minute);
    if (candidate > now + 60 * 1000) {
      return { kind: "iso", at: candidate };
    }
    const next = skopjeYMD(now + 24 * 60 * 60 * 1000);
    return { kind: "iso", at: tsInSkopje(next.year, next.month, next.day, bare.hour, bare.minute) };
  }

  return { kind: "none" };
}
