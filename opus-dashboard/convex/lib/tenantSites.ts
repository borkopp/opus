const MACEDONIAN_TRANSLITERATION: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  ѓ: "gj",
  е: "e",
  ж: "zh",
  з: "z",
  ѕ: "dz",
  и: "i",
  ј: "j",
  к: "k",
  л: "l",
  љ: "lj",
  м: "m",
  н: "n",
  њ: "nj",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  ќ: "kj",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  џ: "dzh",
  ш: "sh",
};

export const RESERVED_TENANT_SUBDOMAINS = new Set([
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "book",
  "booking",
  "cdn",
  "dashboard",
  "docs",
  "help",
  "login",
  "mail",
  "opus",
  "signup",
  "static",
  "status",
  "studio",
  "support",
  "www",
]);

function transliterateMacedonian(value: string): string {
  return Array.from(value.toLowerCase())
    .map((character) => MACEDONIAN_TRANSLITERATION[character] ?? character)
    .join("");
}

export function slugifyBusinessName(value: string): string {
  return transliterateMacedonian(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

function hostnameFromHeader(hostHeader: string | null): string {
  const firstHost = hostHeader?.split(",")[0]?.trim().toLowerCase() ?? "";
  return firstHost.replace(/:\d+$/, "").replace(/\.$/, "");
}

function domainWithoutProtocol(domain: string): string {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/:\d+$/, "");
}

export function isTenantSlugRouteable(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value) &&
    !RESERVED_TENANT_SUBDOMAINS.has(value)
  );
}

export function tenantSlugFromHost(
  hostHeader: string | null,
  rootDomain: string,
): string | null {
  const hostname = hostnameFromHeader(hostHeader);
  const normalizedRootDomain = domainWithoutProtocol(rootDomain);

  const suffix = hostname.endsWith(".localhost")
    ? ".localhost"
    : hostname.endsWith(`.${normalizedRootDomain}`)
      ? `.${normalizedRootDomain}`
      : null;

  if (!suffix) return null;

  const label = hostname.slice(0, -suffix.length);
  return isTenantSlugRouteable(label) ? label : null;
}

export function tenantSiteUrl(slug: string, rootDomain: string): string {
  const cleanDomain = rootDomain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const isLocal = cleanDomain.startsWith("localhost");
  return `${isLocal ? "http" : "https"}://${slug}.${cleanDomain}`;
}
