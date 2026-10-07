import { SafeAreaView } from "react-native-safe-area-context";
import { useConvexConnectionState } from "convex/react";
import { Text } from "@/components/ui/text";
import { useStudio } from "@/providers/studio-provider";
export function ConnectionNotice() {
  const connection = useConvexConnectionState();
  const { colors, t } = useStudio();
  if (
    connection.isWebSocketConnected ||
    (!connection.hasEverConnected && connection.connectionRetries === 0)
  )
    return null;
  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ padding: 14, backgroundColor: colors.dangerSoft }}>
      <Text accessibilityRole="alert" style={{ color: colors.danger }}>
        {t(
          "Reconnecting to your studio. Changes can be saved when connected.",
          "Се поврзува со студиото. Дејствата ќе бидат достапни по поврзувањето.",
        )}
      </Text>
    </SafeAreaView>
  );
}
