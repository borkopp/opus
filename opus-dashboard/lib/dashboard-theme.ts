export const DASHBOARD_THEMES = ["clarity", "studio"] as const;

export type DashboardTheme = (typeof DASHBOARD_THEMES)[number];

export function isDashboardTheme(value: unknown): value is DashboardTheme {
  return value === "clarity" || value === "studio";
}

export function resolveDashboardTheme(value: unknown): DashboardTheme {
  return isDashboardTheme(value) ? value : "clarity";
}

export const dashboardThemeDetails = {
  clarity: {
    name: "Clarity",
    preview: "/themes/clarity.png",
    description: {
      en: "A clear view of your day, with crisp blue accents.",
      mk: "Јасен преглед на денот со сини детали.",
    },
  },
  studio: {
    name: "Studio",
    preview: "/themes/studio.png",
    description: {
      en: "Soft pinks, rounded cards, and room to breathe.",
      mk: "Нежни розови тонови и заоблени картички со повеќе простор.",
    },
  },
} as const;
