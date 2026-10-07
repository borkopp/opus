import { StyleSheet, View, type ViewProps } from "react-native";
import { useStudio } from "@/providers/studio-provider";
import { Text } from "./text";

export function SheetHeader({
  title,
  onDismiss,
  disabled = false,
  panHandlers,
}: {
  title: string;
  onDismiss: () => void;
  disabled?: boolean;
  panHandlers?: ViewProps;
}) {
  const { colors } = useStudio();
  return (
    <View
      {...panHandlers}
      testID="modal-header"
      onAccessibilityEscape={() => {
        if (!disabled) onDismiss();
      }}
      style={[styles.header, { backgroundColor: colors.card }]}
    >
      <View testID="modal-drag-handle" style={styles.handleTouch}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>
      <View style={styles.titleRow}>
        <Text
          variant="heading"
          accessibilityRole="header"
          selectable={false}
          style={styles.title}
        >
          {title}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingBottom: 18, alignItems: "center" },
  handleTouch: {
    minHeight: 24,
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: { width: 36, height: 4, borderRadius: 3 },
  titleRow: {
    minHeight: 44,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { textAlign: "center", fontSize: 18, lineHeight: 25 },
});
