import { Pressable } from "react-native";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useStudio } from "@/providers/studio-provider";

/** Explicit control also covers a detail screen opened above a native sheet. */
export function BackButton() {
  const { colors, t } = useStudio();
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={t("Back", "Назад")}
    onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
    style={({ pressed }) => ({
      width: 44, height: 44, alignItems: "center", justifyContent: "center",
      borderRadius: 22, backgroundColor: pressed ? colors.accent : "transparent",
    })}
  ><ChevronLeft size={26} color={colors.primary} /></Pressable>;
}
