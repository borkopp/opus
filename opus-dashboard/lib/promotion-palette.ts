export type PromotionPalette = {
  background: string;
  text: string;
  accent: string;
  surface: string;
};

export const DEFAULT_PROMOTION_PALETTE: PromotionPalette = {
  background: "#f6f4ed",
  text: "#233c3a",
  accent: "#617f68",
  surface: "#ffffff",
};

export const PROMOTION_PALETTES = [
  {
    id: "sage",
    name: { en: "Sage", mk: "Жалфија" },
    colors: DEFAULT_PROMOTION_PALETTE,
  },
  {
    id: "rose",
    name: { en: "Rose", mk: "Роза" },
    colors: {
      background: "#f9eeef",
      text: "#512e3d",
      accent: "#a45f79",
      surface: "#fff9fa",
    },
  },
  {
    id: "lavender",
    name: { en: "Lavender", mk: "Лаванда" },
    colors: {
      background: "#f0edf8",
      text: "#37304e",
      accent: "#7c68a3",
      surface: "#fcfaff",
    },
  },
  {
    id: "midnight",
    name: { en: "Midnight", mk: "Полноќ" },
    colors: {
      background: "#202c36",
      text: "#faf4e8",
      accent: "#c7a775",
      surface: "#33434f",
    },
  },
];

// Palettes can come from browser storage. Only literal hex colors may enter SVG.
export function normalizePromotionPalette(value: unknown): PromotionPalette {
  const palette = { ...DEFAULT_PROMOTION_PALETTE };
  if (!value || typeof value !== "object") return palette;
  for (const key of Object.keys(palette) as (keyof PromotionPalette)[]) {
    const color = (value as Record<string, unknown>)[key];
    if (typeof color === "string" && /^#[\da-f]{6}$/i.test(color))
      palette[key] = color.toLowerCase();
  }
  return palette;
}

function luminance(color: string) {
  const channels = [1, 3, 5].map((index) => {
    const channel = parseInt(color.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

export function promotionContrast(foreground: string, background: string) {
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function readablePromotionColor(
  color: string,
  background: string,
  minimum = 4.5,
) {
  if (promotionContrast(color, background) >= minimum) return color;
  return promotionContrast("#182e34", background) >= minimum
    ? "#182e34"
    : promotionContrast("#ffffff", background) >= minimum
      ? "#ffffff"
      : "#000000";
}
