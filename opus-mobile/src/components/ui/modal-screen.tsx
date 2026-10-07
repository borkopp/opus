import { KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStudio } from "@/providers/studio-provider";
import { ModalContent, type ModalScreenProps } from "./modal-content";

export function ModalScreen(props: ModalScreenProps) {
  const { colors } = useStudio();
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      accessibilityViewIsModal
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ModalContent {...props} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
