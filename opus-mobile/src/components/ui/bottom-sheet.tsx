import type { ReactNode } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStudio } from "@/providers/studio-provider";
import { SheetHeader } from "./sheet-header";
import { useModalMotion } from "@/hooks/use-modal-motion";

export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors, t } = useStudio();
  const { height } = useWindowDimensions();
  const motion = useModalMotion({
    visible,
    onDismiss: onClose,
    distance: height,
  });
  return (
    <Modal
      visible={motion.mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(7, 26, 44, 0.3)" },
            motion.backdropStyle,
          ]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("Dismiss", "Затвори го прозорецот")}
        />
        <Animated.View
          testID="modal-sheet"
          style={[
            styles.sheet,
            motion.panelStyle,
            { backgroundColor: colors.card },
          ]}
        >
          <SafeAreaView
            edges={["bottom", "left", "right"]}
            accessibilityViewIsModal
            role="dialog"
            aria-modal
            aria-label={title}
            onAccessibilityEscape={onClose}
            style={{ flexShrink: 1 }}
          >
            <SheetHeader
              title={title}
              onDismiss={onClose}
              panHandlers={motion.panHandlers}
            />
            <ScrollView
              style={{ flexShrink: 1, flexGrow: 0 }}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "85%",
    alignSelf: "center",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },
  content: { paddingHorizontal: 20, paddingBottom: 24, gap: 20 },
});
