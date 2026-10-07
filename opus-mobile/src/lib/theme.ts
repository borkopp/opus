export type ThemeName = "clarity" | "studio";
export type Language = "en" | "mk";

// Keep the web dashboard's canvas and brand colors. Studio uses warmer pink
// control surfaces; shared semantic tokens carry the theme into every modal.
export const palettes = {
  clarity: {
    background: "#f5f6f8",
    card: "#ffffff",
    foreground: "#1e2229",
    muted: "#747b85",
    brand: "#2588c8",
    primary: "#3679f6",
    primaryText: "#ffffff",
    accent: "#eaf1ff",
    accentText: "#245dc3",
    border: "#eceef2",
    secondary: "#f1f3f6",
    success: "#4c8065",
    successSoft: "#edf5ef",
    danger: "#b74848",
    dangerSoft: "#fff0f0",
    peach: "#f2e2d7",
    sage: "#dce9df",
    lilac: "#ece5f9",
    navy: "#071a2c",
  },
  studio: {
    background: "#f6f5f9",
    card: "#ffffff",
    foreground: "#252330",
    muted: "#71636e",
    brand: "#c66f96",
    primary: "#b04378",
    primaryText: "#ffffff",
    accent: "#fae5ef",
    accentText: "#8f3861",
    border: "#edd8e3",
    secondary: "#f5e8ee",
    success: "#4c8065",
    successSoft: "#edf5ef",
    danger: "#b74848",
    dangerSoft: "#fff0f0",
    peach: "#f4dfe5",
    sage: "#dce9df",
    lilac: "#ece5f9",
    navy: "#252330",
  },
} as const;

export type Palette = { [Key in keyof typeof palettes.clarity]: string };
export type LocalizedText = { en: string; mk: string };
export const localeFor = (language: Language) =>
  language === "mk" ? "mk-MK" : "en-GB";
