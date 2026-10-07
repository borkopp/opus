import { Text as NativeText, type TextProps, StyleSheet } from "react-native";
import { useStudio } from "@/providers/studio-provider";

export function Text({
  variant = "body",
  tone = "default",
  style,
  ...props
}: TextProps & {
  variant?: "body" | "title" | "heading" | "label" | "caption" | "metric";
  tone?: "default" | "muted" | "primary" | "inverse";
}) {
  const { colors, font, mediumFont, semiboldFont } = useStudio();
  const family =
    variant === "heading" || variant === "label"
      ? semiboldFont
      : variant === "title" || variant === "metric"
        ? mediumFont
        : font;
  const color =
    tone === "muted"
      ? colors.muted
      : tone === "primary"
        ? colors.primary
        : tone === "inverse"
          ? colors.primaryText
          : colors.foreground;
  return (
    <NativeText
      {...props}
      style={[{ color, fontFamily: family }, styles[variant], style]}
    />
  );
}
const styles = StyleSheet.create({
  body: { fontSize: 14, lineHeight: 21 },
  title: { fontSize: 30, lineHeight: 38, letterSpacing: -1.1 },
  heading: { fontSize: 17, lineHeight: 24, letterSpacing: -0.35 },
  label: { fontSize: 13, lineHeight: 19 },
  caption: { fontSize: 12, lineHeight: 18 },
  metric: {
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -1.2,
    fontVariant: ["tabular-nums"],
  },
});
