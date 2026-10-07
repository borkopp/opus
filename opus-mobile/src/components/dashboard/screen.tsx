import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStudio } from "@/providers/studio-provider";
import { Text } from "@/components/ui/text";

export function Screen({
  children,
  title,
  subtitle,
  action,
  scroll = true,
  underHeader = false,
  safeBottom = false,
  keyboardAvoiding = false,
  contentStyle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
  underHeader?: boolean;
  safeBottom?: boolean;
  keyboardAvoiding?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useStudio();
  const content = (
    <View
      style={[styles.content, !scroll && styles.fixedContent, contentStyle]}
    >
      {title && (
        <View style={styles.heading}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="title">{title}</Text>
            {subtitle && <Text tone="muted">{subtitle}</Text>}
          </View>
          {action}
        </View>
      )}
      {children}
    </View>
  );
  return (
    <SafeAreaView
      edges={
        underHeader ? ["left", "right", "bottom"] : safeBottom ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]
      }
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView style={styles.screen} enabled={keyboardAvoiding} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  fixedContent: { flex: 1, minHeight: 0 },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 22,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
});
