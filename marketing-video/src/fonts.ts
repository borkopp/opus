import {loadFont as loadCommissioner} from "@remotion/google-fonts/Commissioner";
import {loadFont as loadLora} from "@remotion/google-fonts/Lora";

export const commissioner = loadCommissioner("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["cyrillic", "latin"],
});

export const loraItalic = loadLora("italic", {
  weights: ["500"],
  subsets: ["cyrillic", "latin"],
});

export const FONTS = {
  display: commissioner.fontFamily,
  body: commissioner.fontFamily,
  utility: commissioner.fontFamily,
  mono: commissioner.fontFamily,
  accent: loraItalic.fontFamily,
  wordmark: commissioner.fontFamily,
} as const;
