import { useEffect, useId, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Text } from "./text";

// Match the web dashboard's Pro fill and luminous gradient rim.
const fill = ["#124c80", "#236caa", "#5550a0", "#124c80"];
const rim = ["#2588c8", "#64c9df", "#b2ddf5", "#a7a4e8", "#5795db", "#2588c8"];

export function ProBadge({ active = true }: { active?: boolean }) {
  const id = useId().replace(/:/g, "");
  const [progress] = useState(() => new Animated.Value(0));
  const [size, setSize] = useState({ width: 120, height: 38 });
  const reducedMotion = useReducedMotion();
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    progress.setValue(0);
    if (!active || !foreground || reducedMotion) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
          isInteraction: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, foreground, progress, reducedMotion]);
  return (
    <View
      onLayout={({ nativeEvent: { layout } }) => {
        setSize((current) =>
          current.width === layout.width && current.height === layout.height
            ? current
            : { width: layout.width, height: layout.height },
        );
      }}
      style={styles.badge}
    >
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.gradient,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -size.width],
                }),
              },
            ],
          },
        ]}
      >
        <Svg
          width={size.width * 2}
          height={size.height}
          viewBox={`0 0 ${size.width * 2} ${size.height}`}
        >
          <Defs>
            <LinearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="0">
              {rim.map((color, index) => (
                <Stop
                  key={index}
                  offset={index / (rim.length - 1)}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
            <LinearGradient id={`${id}fill`} x1="0" y1="0" x2="1" y2="0.3">
              {fill.map((color, index) => (
                <Stop
                  key={index}
                  offset={index / (fill.length - 1)}
                  stopColor={color}
                />
              ))}
            </LinearGradient>
            <LinearGradient id={`${id}shine`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0.3" stopColor="white" stopOpacity={0} />
              <Stop offset="0.48" stopColor="white" stopOpacity={0.22} />
              <Stop offset="0.66" stopColor="white" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect
            width={size.width * 2}
            height={size.height}
            fill={`url(#${id}rim)`}
          />
          <Rect
            x={0}
            y={1.5}
            width={size.width * 2}
            height={size.height - 3}
            fill={`url(#${id}fill)`}
          />
          <Rect
            width={size.width * 2}
            height={size.height}
            fill={`url(#${id}shine)`}
          />
        </Svg>
      </Animated.View>
      <Text variant="label" style={styles.label}>
        OPUS Pro
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 38,
    paddingVertical: 9,
    paddingHorizontal: 16,
    alignSelf: "center",
    borderRadius: 19,
    overflow: "hidden",
    backgroundColor: "#124c80",
    boxShadow: "0 2px 8px rgba(37, 136, 200, 0.28)",
  },
  gradient: { position: "absolute", top: 0, left: 0 },
  label: { color: "#ffffff", letterSpacing: 0.3 },
});
