export interface ServiceTheme {
  id: string;
  name: string;
  // Card container styling
  cardBg: string;
  cardBorder: string;
  hoverBorder: string;
  // Vertical pill indicator on the left
  accentBar: string;
  // Typography
  textPrimary: string;
  textSecondary: string;
  timeText: string;
  // Badges & Pills
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  priceBg: string;
  priceText: string;
  // Active / Selected ring
  ring: string;
}

export const SERVICE_THEMES: Record<string, ServiceTheme> = {
  // 1. Sky / Indigo: Precision cuts, fades, scissor cuts, junior haircuts
  cuts: {
    id: "cuts",
    name: "Haircuts & Fades",
    cardBg: "bg-sky-500/[0.08] dark:bg-sky-500/[0.14] hover:bg-sky-500/[0.12] dark:hover:bg-sky-500/[0.18]",
    cardBorder: "border-sky-300/80 dark:border-sky-700/70",
    hoverBorder: "hover:border-sky-400 dark:hover:border-sky-500",
    accentBar: "bg-sky-500 dark:bg-sky-400",
    textPrimary: "text-sky-950 dark:text-sky-100",
    textSecondary: "text-sky-800/85 dark:text-sky-300/85",
    timeText: "text-sky-800 dark:text-sky-300",
    badgeBg: "bg-sky-100/90 dark:bg-sky-900/60",
    badgeText: "text-sky-800 dark:text-sky-200",
    badgeBorder: "border-sky-200/80 dark:border-sky-700/80",
    priceBg: "bg-sky-100/70 dark:bg-sky-900/50",
    priceText: "text-sky-900 dark:text-sky-200",
    ring: "ring-sky-500",
  },

  // 2. Warm Amber / Terracotta: Beard trims, hot towel shaves, beard contouring, combos
  beard: {
    id: "beard",
    name: "Beard & Grooming",
    cardBg: "bg-amber-500/[0.09] dark:bg-amber-500/[0.14] hover:bg-amber-500/[0.13] dark:hover:bg-amber-500/[0.18]",
    cardBorder: "border-amber-300/80 dark:border-amber-700/70",
    hoverBorder: "hover:border-amber-400 dark:hover:border-amber-500",
    accentBar: "bg-amber-500 dark:bg-amber-400",
    textPrimary: "text-amber-950 dark:text-amber-100",
    textSecondary: "text-amber-800/85 dark:text-amber-300/85",
    timeText: "text-amber-800 dark:text-amber-300",
    badgeBg: "bg-amber-100/90 dark:bg-amber-900/60",
    badgeText: "text-amber-800 dark:text-amber-200",
    badgeBorder: "border-amber-200/80 dark:border-amber-700/80",
    priceBg: "bg-amber-100/70 dark:bg-amber-900/50",
    priceText: "text-amber-900 dark:text-amber-200",
    ring: "ring-amber-500",
  },

  // 3. Purple / Berry: Hair dyeing, balayage, toner, color treatments
  color: {
    id: "color",
    name: "Color & Dye",
    cardBg: "bg-purple-500/[0.08] dark:bg-purple-500/[0.14] hover:bg-purple-500/[0.12] dark:hover:bg-purple-500/[0.18]",
    cardBorder: "border-purple-300/80 dark:border-purple-700/70",
    hoverBorder: "hover:border-purple-400 dark:hover:border-purple-500",
    accentBar: "bg-purple-500 dark:bg-purple-400",
    textPrimary: "text-purple-950 dark:text-purple-100",
    textSecondary: "text-purple-800/85 dark:text-purple-300/85",
    timeText: "text-purple-800 dark:text-purple-300",
    badgeBg: "bg-purple-100/90 dark:bg-purple-900/60",
    badgeText: "text-purple-800 dark:text-purple-200",
    badgeBorder: "border-purple-200/80 dark:border-purple-700/80",
    priceBg: "bg-purple-100/70 dark:bg-purple-900/50",
    priceText: "text-purple-900 dark:text-purple-200",
    ring: "ring-purple-500",
  },

  // 4. Emerald / Mint: Hair wash, scalp treatments, blowout, styling
  wash: {
    id: "wash",
    name: "Wash & Blowout",
    cardBg: "bg-emerald-500/[0.08] dark:bg-emerald-500/[0.14] hover:bg-emerald-500/[0.12] dark:hover:bg-emerald-500/[0.18]",
    cardBorder: "border-emerald-300/80 dark:border-emerald-700/70",
    hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500",
    accentBar: "bg-emerald-500 dark:bg-emerald-400",
    textPrimary: "text-emerald-950 dark:text-emerald-100",
    textSecondary: "text-emerald-800/85 dark:text-emerald-300/85",
    timeText: "text-emerald-800 dark:text-emerald-300",
    badgeBg: "bg-emerald-100/90 dark:bg-emerald-900/60",
    badgeText: "text-emerald-800 dark:text-emerald-200",
    badgeBorder: "border-emerald-200/80 dark:border-emerald-700/80",
    priceBg: "bg-emerald-100/70 dark:bg-emerald-900/50",
    priceText: "text-emerald-900 dark:text-emerald-200",
    ring: "ring-emerald-500",
  },

  // 5. Rose / Coral: Nails, manicures, pedicures, brows, lashes
  aesthetics: {
    id: "aesthetics",
    name: "Nails & Aesthetics",
    cardBg: "bg-rose-500/[0.08] dark:bg-rose-500/[0.14] hover:bg-rose-500/[0.12] dark:hover:bg-rose-500/[0.18]",
    cardBorder: "border-rose-300/80 dark:border-rose-700/70",
    hoverBorder: "hover:border-rose-400 dark:hover:border-rose-500",
    accentBar: "bg-rose-500 dark:bg-rose-400",
    textPrimary: "text-rose-950 dark:text-rose-100",
    textSecondary: "text-rose-800/85 dark:text-rose-300/85",
    timeText: "text-rose-800 dark:text-rose-300",
    badgeBg: "bg-rose-100/90 dark:bg-rose-900/60",
    badgeText: "text-rose-800 dark:text-rose-200",
    badgeBorder: "border-rose-200/80 dark:border-rose-700/80",
    priceBg: "bg-rose-100/70 dark:bg-rose-900/50",
    priceText: "text-rose-900 dark:text-rose-200",
    ring: "ring-rose-500",
  },

  // 6. Teal / Cyan: Facials, skincare, massage
  spa: {
    id: "spa",
    name: "Spa & Wellness",
    cardBg: "bg-teal-500/[0.08] dark:bg-teal-500/[0.14] hover:bg-teal-500/[0.12] dark:hover:bg-teal-500/[0.18]",
    cardBorder: "border-teal-300/80 dark:border-teal-700/70",
    hoverBorder: "hover:border-teal-400 dark:hover:border-teal-500",
    accentBar: "bg-teal-500 dark:bg-teal-400",
    textPrimary: "text-teal-950 dark:text-teal-100",
    textSecondary: "text-teal-800/85 dark:text-teal-300/85",
    timeText: "text-teal-800 dark:text-teal-300",
    badgeBg: "bg-teal-100/90 dark:bg-teal-900/60",
    badgeText: "text-teal-800 dark:text-teal-200",
    badgeBorder: "border-teal-200/80 dark:border-teal-700/80",
    priceBg: "bg-teal-100/70 dark:bg-teal-900/50",
    priceText: "text-teal-900 dark:text-teal-200",
    ring: "ring-teal-500",
  },
};

const THEME_LIST: ServiceTheme[] = [
  SERVICE_THEMES.cuts,
  SERVICE_THEMES.beard,
  SERVICE_THEMES.color,
  SERVICE_THEMES.wash,
  SERVICE_THEMES.aesthetics,
  SERVICE_THEMES.spa,
];

/**
 * Returns an expressive, beautiful theme for a service based on its title or category.
 */
export function getServiceTheme(serviceName?: string | null): ServiceTheme {
  if (!serviceName) return SERVICE_THEMES.cuts;

  const lower = serviceName.toLowerCase();

  // 1. Hair dye / color / balayage
  if (
    lower.includes("dye") ||
    lower.includes("color") ||
    lower.includes("фарб") ||
    lower.includes("боењ") ||
    lower.includes("нијанс") ||
    lower.includes("balayage") ||
    lower.includes("prameni") ||
    lower.includes("прамен")
  ) {
    return SERVICE_THEMES.color;
  }

  // 2. Beard, shaves, combos
  if (
    lower.includes("beard") ||
    lower.includes("брада") ||
    lower.includes("shave") ||
    lower.includes("брич") ||
    lower.includes("combo") ||
    lower.includes("комбо") ||
    lower.includes("towel")
  ) {
    return SERVICE_THEMES.beard;
  }

  // 3. Hair wash, scalp care, blowouts
  if (
    lower.includes("wash") ||
    lower.includes("миењ") ||
    lower.includes("blowout") ||
    lower.includes("фенирањ") ||
    lower.includes("scalp") ||
    lower.includes("скалп") ||
    lower.includes("mask")
  ) {
    return SERVICE_THEMES.wash;
  }

  // 4. Haircuts, fades, scissor cuts, junior
  if (
    lower.includes("fade") ||
    lower.includes("cut") ||
    lower.includes("шишањ") ||
    lower.includes("haircut") ||
    lower.includes("junior") ||
    lower.includes("дец") ||
    lower.includes("scissor") ||
    lower.includes("фризур")
  ) {
    return SERVICE_THEMES.cuts;
  }

  // 5. Nails & Aesthetics
  if (
    lower.includes("manicure") ||
    lower.includes("маникир") ||
    lower.includes("pedicure") ||
    lower.includes("педикир") ||
    lower.includes("nail") ||
    lower.includes("нокт") ||
    lower.includes("lash") ||
    lower.includes("brow") ||
    lower.includes("веѓ") ||
    lower.includes("трепк")
  ) {
    return SERVICE_THEMES.aesthetics;
  }

  // 6. Skincare & Spa
  if (
    lower.includes("facial") ||
    lower.includes("масаж") ||
    lower.includes("massage") ||
    lower.includes("face") ||
    lower.includes("лице") ||
    lower.includes("spa")
  ) {
    return SERVICE_THEMES.spa;
  }

  // Deterministic fallback based on string char sum
  let hash = 0;
  for (let i = 0; i < serviceName.length; i++) {
    hash = (hash + serviceName.charCodeAt(i) * 31) % THEME_LIST.length;
  }
  return THEME_LIST[Math.abs(hash) % THEME_LIST.length];
}
