import type { ReactNode, Ref } from "react";
import { ScrollView, View, StyleSheet, type ViewProps } from "react-native";
import { useStudio } from "@/providers/studio-provider";
import { SheetHeader } from "./sheet-header";
import type { ModalMotionHandle } from "@/hooks/use-modal-motion";

export type ModalScreenProps = {
  title: string;
  onClose: () => void;
  closeDisabled?: boolean;
  visible?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  motionRef?: Ref<ModalMotionHandle>;
};

export function ModalContent({
  title,
  onClose,
  closeDisabled,
  children,
  footer,
  panHandlers,
}: ModalScreenProps & { panHandlers?: ViewProps }) {
  const { colors } = useStudio();
  return (
    <View
      onAccessibilityEscape={() => {
        if (!closeDisabled) onClose();
      }}
      style={[styles.content, { backgroundColor: colors.background }]}
    >
      <SheetHeader
        title={title}
        onDismiss={onClose}
        disabled={closeDisabled}
        panHandlers={panHandlers}
      />
      <ScrollView
        testID="appointment-modal-content"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
      >
        {children}
      </ScrollView>
      {footer && (
        <View
          testID="appointment-modal-footer"
          style={[
            styles.footer,
            { backgroundColor: colors.card, borderTopColor: colors.border },
          ]}
        >
          {footer}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, minHeight: 0 },
  scroll: { padding: 20, paddingTop: 8, paddingBottom: 24, gap: 16 },
  footer: { padding: 16, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
