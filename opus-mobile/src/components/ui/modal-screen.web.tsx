import { useImperativeHandle } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useStudio } from "@/providers/studio-provider";
import { ModalContent, type ModalScreenProps } from "./modal-content";
import { useModalMotion } from "@/hooks/use-modal-motion";

export function ModalScreen(props: ModalScreenProps) {
  const { width, height } = useWindowDimensions();
  const { colors, t } = useStudio();
  const wide = width >= 700;
  const motion = useModalMotion({
    visible: props.visible ?? true,
    onDismiss: props.onClose,
    disabled: props.closeDisabled,
    distance: height,
    centered: wide,
  });
  useImperativeHandle(props.motionRef, () => ({ exit: motion.exit }), [
    motion.exit,
  ]);
  return (
    <Modal
      visible={motion.mounted}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (!props.closeDisabled) props.onClose();
      }}
    >
      <View
        style={[
          styles.overlay,
          {
            justifyContent: wide ? "center" : "flex-end",
            padding: wide ? 24 : 12,
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(7, 26, 44, 0.3)" },
            motion.backdropStyle,
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Dismiss", "Затвори го прозорецот")}
          disabled={props.closeDisabled}
          onPress={props.onClose}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          role="dialog"
          aria-modal
          aria-label={props.title}
          testID="appointment-modal"
          style={[
            styles.dialog,
            { backgroundColor: colors.background, borderColor: colors.border },
            motion.panelStyle,
          ]}
        >
          <ModalContent {...props} panHandlers={motion.panHandlers} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
  },
  dialog: {
    width: "100%",
    maxWidth: 600,
    height: "90%",
    maxHeight: 920,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    boxShadow: "0 20px 64px rgba(7, 26, 44, 0.16)",
  },
});
