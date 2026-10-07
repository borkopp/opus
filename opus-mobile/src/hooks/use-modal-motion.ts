import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, Platform } from "react-native";
import { useReducedMotion } from "./use-reduced-motion";

export type ModalMotionHandle = { exit: (after: () => void) => void };

export function useModalMotion({
  visible,
  onDismiss,
  disabled = false,
  distance,
  centered = false,
}: {
  visible: boolean;
  onDismiss: () => void;
  disabled?: boolean;
  distance: number;
  centered?: boolean;
}) {
  const reduced = useReducedMotion();
  const [retained, setRetained] = useState(visible);
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const exited = useRef(false);
  if (visible && !retained) setRetained(true);
  const useNativeDriver = Platform.OS !== "web";
  const exit = useCallback(
    (after: () => void) => {
      if (exited.current) {
        after();
        return;
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: reduced ? 100 : 200,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver,
      }).start(({ finished }) => {
        if (finished) {
          exited.current = true;
          after();
        }
      });
    },
    [progress, reduced, useNativeDriver],
  );

  useEffect(() => {
    if (visible) {
      exited.current = false;
      drag.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: reduced ? 120 : 280,
        easing: Easing.bezier(0.32, 0.72, 0, 1),
        useNativeDriver,
      }).start();
    } else {
      exit(() => setRetained(false));
    }
    return () => progress.stopAnimation();
  }, [visible, progress, drag, reduced, useNativeDriver, exit]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) =>
          visible && !disabled && event.nativeEvent.touches.length === 1,
        onMoveShouldSetPanResponderCapture: (event, gesture) =>
          !disabled &&
          visible &&
          event.nativeEvent.touches.length === 1 &&
          Math.abs(gesture.dy) > 5 &&
          Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.2,
        onPanResponderGrant: (event) => {
          drag.stopAnimation();
          if (Platform.OS === "web") event.preventDefault();
        },
        onPanResponderMove: (_event, gesture) => {
          drag.setValue(
            gesture.dy < 0 ? Math.max(-18, gesture.dy / 5) : gesture.dy,
          );
        },
        onPanResponderRelease: (_event, gesture) => {
          if (
            !disabled &&
            (gesture.dy > 90 || (gesture.dy > 12 && gesture.vy > 0.5))
          )
            onDismiss();
          else
            Animated.spring(drag, {
              toValue: 0,
              stiffness: 350,
              damping: 35,
              mass: 0.8,
              overshootClamping: true,
              useNativeDriver,
            }).start();
        },
        onPanResponderTerminate: () =>
          Animated.spring(drag, {
            toValue: 0,
            stiffness: 350,
            damping: 35,
            useNativeDriver,
          }).start(),
      }),
    [disabled, visible, drag, onDismiss, useNativeDriver],
  );

  return {
    mounted: visible || retained,
    exit,
    panHandlers: pan.panHandlers,
    backdropStyle: { opacity: progress },
    panelStyle: {
      opacity: progress,
      transform: [
        {
          translateY: Animated.add(
            reduced
              ? 0
              : progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [centered ? 24 : distance, 0],
                }),
            reduced ? 0 : drag,
          ),
        },
        {
          scale:
            reduced || !centered
              ? 1
              : progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
        },
      ],
    },
  };
}
