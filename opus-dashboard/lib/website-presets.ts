import type { WebsiteDesign } from "../../shared/website-design";

export const WEBSITE_THEMES = [
  {
    id: "linen",
    name: ["Linen", "Лен", "Liri"],
    background: "#f8f6f1",
    surface: "#eeeae2",
    text: "#302f2b",
    accent: "#605c43",
  },
  {
    id: "rose",
    name: ["Rosé", "Розе", "Rozë"],
    background: "#fcf6f5",
    surface: "#f3e5e3",
    text: "#422d32",
    accent: "#985567",
  },
  {
    id: "sage",
    name: ["Sage", "Жалфија", "Sherebelë"],
    background: "#f4f7f1",
    surface: "#e3ebdc",
    text: "#273328",
    accent: "#53704e",
  },
  {
    id: "ink",
    name: ["After hours", "По работно време", "Pas orarit"],
    background: "#1c1e20",
    surface: "#2a2d30",
    text: "#f2efe8",
    accent: "#d4c7a1",
  },
  {
    id: "clay",
    name: ["Terracotta", "Теракота", "Terrakotë"],
    background: "#fbf4eb",
    surface: "#f0e0d0",
    text: "#4c352a",
    accent: "#a25a3c",
  },
  {
    id: "pearl",
    name: ["Pearl", "Бисер", "Perla"],
    background: "#ffffff",
    surface: "#f0f1f3",
    text: "#272b33",
    accent: "#4c566a",
  },
] as const;

function luminance(hex: string): number {
  const rgb = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((part) => {
      const v = parseInt(part, 16) / 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    }) ?? [1, 1, 1];
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

export function websiteColors(design: WebsiteDesign) {
  const theme =
    WEBSITE_THEMES.find((t) => t.id === design.theme) ?? WEBSITE_THEMES[0];
  const background = design.backgroundColor || theme.background;
  const text = design.backgroundColor
    ? luminance(background) > 0.3
      ? "#232323"
      : "#faf9f6"
    : theme.text;
  const accent = design.accentColor || theme.accent;
  return {
    background,
    surface: design.backgroundColor ? background : theme.surface,
    text,
    accent,
    onAccent: luminance(accent) > 0.179 ? "#171717" : "#ffffff",
  };
}

export const WEBSITE_FONTS = {
  modern: "var(--font-manrope), Arial, sans-serif",
  editorial: 'Georgia, "Times New Roman", serif',
  classic: '"Palatino Linotype", Palatino, Georgia, serif',
  mono: "var(--font-ibm-plex-mono), monospace",
};
