import { useContext, useEffect, useState, type ComponentProps } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from "expo-router/js-tabs";
import {
  CommonActions,
  PlatformPressable,
  useLinkBuilder,
} from "expo-router/react-navigation";
import { Text } from "@/components/ui/text";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useStudio } from "@/providers/studio-provider";

const useNativeDriver = Platform.OS !== "web";
const easing = Easing.bezier(0.23, 1, 0.32, 1);
type TabOptions = BottomTabBarProps["descriptors"][string]["options"];
type TabPress = NonNullable<
  ComponentProps<typeof PlatformPressable>["onPress"]
>;

function TabButton({
  options,
  label,
  focused,
  reducedMotion,
  href,
  onPress,
  onLongPress,
}: {
  options: TabOptions;
  label: string;
  focused: boolean;
  reducedMotion: boolean;
  href?: string;
  onPress: TabPress;
  onLongPress: () => void;
}) {
  const { colors, mediumFont, semiboldFont } = useStudio();
  const [selection] = useState(() => new Animated.Value(focused ? 1 : 0));
  const [press] = useState(() => new Animated.Value(1));
  const color = focused ? colors.accentText : colors.muted;

  useEffect(() => {
    if (reducedMotion) {
      selection.stopAnimation();
      selection.setValue(focused ? 1 : 0);
      press.stopAnimation();
      press.setValue(1);
      return;
    }
    const animation = Animated.timing(selection, {
      toValue: focused ? 1 : 0,
      duration: 200,
      easing,
      useNativeDriver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [focused, reducedMotion, selection, press]);

  function pressTo(value: number) {
    if (reducedMotion) return;
    Animated.timing(press, {
      toValue: value,
      duration: 120,
      easing,
      useNativeDriver,
      isInteraction: false,
    }).start();
  }

  return (
    <PlatformPressable
      href={href}
      role="tab"
      accessibilityRole="tab"
      accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
      accessibilityState={{ selected: focused }}
      aria-selected={focused}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={(event) => {
        // Keyboard activation should respond immediately, without press motion.
        if (Platform.OS !== "web" || event.nativeEvent.pageX !== 0)
          pressTo(0.95);
      }}
      onPressOut={() => pressTo(1)}
      pressOpacity={1}
      android_ripple={{ color: "transparent" }}
      hoverEffect={{
        color: colors.primary,
        hoverOpacity: 0.06,
        activeOpacity: 0,
      }}
      style={[
        styles.tab,
        Platform.OS === "web" && {
          outlineColor: colors.primary,
          outlineOffset: 2,
        },
      ]}
    >
      <Animated.View
        style={[styles.tabContent, { transform: [{ scale: press }] }]}
      >
        <Animated.View
          style={{
            transform: [
              {
                translateY: selection.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -1.5],
                }),
              },
              {
                scale: selection.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.06],
                }),
              },
            ],
          }}
        >
          {options.tabBarIcon?.({ focused, color, size: 21 })}
        </Animated.View>
        {typeof options.tabBarLabel === "function" ? (
          options.tabBarLabel({
            focused,
            color,
            position: "below-icon",
            children: label,
          })
        ) : (
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              { color, fontFamily: focused ? semiboldFont : mediumFont },
            ]}
          >
            {label}
          </Text>
        )}
      </Animated.View>
    </PlatformPressable>
  );
}

export function AnimatedTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const { colors, t } = useStudio();
  const reducedMotion = useReducedMotion();
  const { buildHref } = useLinkBuilder();
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  const [width, setWidth] = useState(0);
  const [position] = useState(() => new Animated.Value(state.index));
  const [keyboardSelection, setKeyboardSelection] = useState(false);
  const instant = reducedMotion || keyboardSelection;
  const tabWidth = width / state.routes.length;

  useEffect(() => {
    if (instant) {
      position.stopAnimation();
      position.setValue(state.index);
      return;
    }
    const animation = Animated.timing(position, {
      toValue: state.index,
      duration: 240,
      easing,
      useNativeDriver,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [state.index, instant, position]);

  return (
    <View
      testID="bottom-tab-bar"
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingLeft: Math.max(insets.left, 12),
          paddingRight: Math.max(insets.right, 12),
        },
      ]}
    >
      <View
        style={[
          styles.dock,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <View
          role="tablist"
          accessibilityLabel={t("Main navigation", "Главна навигација")}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          style={styles.tabs}
        >
          {width > 0 && (
            <Animated.View
              testID="bottom-tab-indicator"
              pointerEvents="none"
              style={[
                styles.indicator,
                {
                  width: tabWidth,
                  backgroundColor: colors.accent,
                  transform: [
                    { translateX: Animated.multiply(position, tabWidth) },
                  ],
                },
              ]}
            />
          )}
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === "string"
                ? options.tabBarLabel
                : (options.title ?? route.name);
            return (
              <TabButton
                key={route.key}
                options={options}
                label={label}
                focused={focused}
                reducedMotion={instant}
                href={buildHref(route.name, route.params)}
                onPress={(event) => {
                  setKeyboardSelection(
                    Platform.OS === "web" &&
                      "detail" in event &&
                      event.detail === 0,
                  );
                  const tabEvent = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !tabEvent.defaultPrevented)
                    navigation.dispatch({
                      ...CommonActions.navigate(route),
                      target: state.key,
                    });
                }}
                onLongPress={() =>
                  navigation.emit({ type: "tabLongPress", target: route.key })
                }
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 4 },
  dock: {
    width: "100%",
    maxWidth: 540,
    alignSelf: "center",
    padding: 5,
    borderWidth: 1,
    borderRadius: 28,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 5px 22px rgba(37, 35, 48, 0.08)" }
      : {
          shadowColor: "#252330",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 4,
        }),
  },
  tabs: { flexDirection: "row", height: 54 },
  indicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 22,
  },
  tab: { flex: 1, minWidth: 0, borderRadius: 22, justifyContent: "center" },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  label: { fontSize: 10, lineHeight: 14, textAlign: "center" },
});
