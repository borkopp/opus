export type CookieConsent = { analytics: boolean; marketing: boolean };

export const CONSENT_COOKIE = "opus_consent_v1";
export const CONSENT_EVENT = "opus:consent-change";
export const PREFERENCES_EVENT = "opus:cookie-preferences";
export const DENIED_CONSENT: CookieConsent = {
  analytics: false,
  marketing: false,
};
let sessionChoice: string | null = null;

export function isPlatformHost(hostname: string) {
  return [
    "opus.mk",
    "www.opus.mk",
    "studio.opus.mk",
    "localhost",
    "127.0.0.1",
  ].includes(hostname);
}

export function readConsentSnapshot(): string | null {
  if (typeof document === "undefined") return null;
  if (sessionChoice) return sessionChoice;
  try {
    const value = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
      ?.split("=")[1];
    return value && /^v1\.[01]\.[01]$/.test(value) ? value : sessionChoice;
  } catch {
    return sessionChoice;
  }
}

export function parseConsent(value: string | null): CookieConsent {
  if (!value || !/^v1\.[01]\.[01]$/.test(value)) return DENIED_CONSENT;
  const [, analytics, marketing] = value.split(".");
  return { analytics: analytics === "1", marketing: marketing === "1" };
}

export function getConsent(): CookieConsent {
  return parseConsent(readConsentSnapshot());
}

function cookieDomain() {
  return ["opus.mk", "www.opus.mk", "studio.opus.mk"].includes(
    window.location.hostname,
  )
    ? "; Domain=opus.mk"
    : "";
}

export function clearMetaCookies() {
  if (typeof document === "undefined") return;
  for (const name of ["_fbp", "_fbc"]) {
    // Remove both host-only and parent-domain cookies.
    for (const domain of [
      "",
      `; Domain=${window.location.hostname}`,
      cookieDomain(),
    ]) {
      try {
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain}`;
      } catch {
        /* Cookies may be blocked. */
      }
    }
  }
}

export function saveConsent(consent: CookieConsent) {
  if (
    typeof window === "undefined" ||
    !isPlatformHost(window.location.hostname)
  )
    return;
  const value = `v1.${Number(consent.analytics)}.${Number(consent.marketing)}`;
  sessionChoice = null;
  try {
    document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=15552000; SameSite=Lax${cookieDomain()}${window.location.protocol === "https:" ? "; Secure" : ""}`;
  } catch {
    /* Keep the explicit choice in memory if cookies are blocked. */
  }
  sessionChoice = readConsentSnapshot() === value ? null : value;
  if (!consent.marketing) clearMetaCookies();
  // The cookie is the source of truth. This value only wakes other tabs on this origin.
  try {
    window.localStorage.setItem(CONSENT_EVENT, String(Date.now()));
  } catch {
    /* Storage may be blocked. */
  }
  window.dispatchEvent(new Event(CONSENT_EVENT));
}

export function subscribeConsent(listener: () => void) {
  const onVisibility = () => {
    if (document.visibilityState === "visible") listener();
  };
  window.addEventListener(CONSENT_EVENT, listener);
  window.addEventListener("storage", listener);
  window.addEventListener("focus", listener);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener(CONSENT_EVENT, listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener("focus", listener);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

export function openCookiePreferences() {
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}

export const consentCopy = {
  mk: {
    title: "Вашиот избор за колачиња",
    description:
      "Неопходните колачиња го овозможуваат работењето на OPUS. Со ваша согласност користиме PostHog за подобрување на платформата и Meta Pixel за мерење на рекламите за OPUS. Изборот важи и при регистрација на studio.opus.mk.",
    analytics: "Аналитика · PostHog",
    marketing: "Рекламирање · Meta",
    accept: "Прифати ги сите",
    reject: "Само неопходни",
    save: "Зачувај избор",
    preferences: "Поставки за колачиња",
    privacy: "Политика за приватност",
  },
  en: {
    title: "Your cookie choices",
    description:
      "Necessary cookies keep OPUS working. With your permission, we use PostHog to improve the platform and Meta Pixel to measure OPUS ads. Your choice also applies when you register at studio.opus.mk.",
    analytics: "Analytics · PostHog",
    marketing: "Advertising · Meta",
    accept: "Accept all",
    reject: "Necessary only",
    save: "Save choices",
    preferences: "Cookie settings",
    privacy: "Privacy policy",
  },
} as const;
