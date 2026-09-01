import {Easing, interpolate, spring} from "remotion";

export const clamp = (
  frame: number,
  input: [number, number],
  output: [number, number],
) =>
  interpolate(frame, input, output, {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const linear = (
  frame: number,
  input: [number, number],
  output: [number, number],
) =>
  interpolate(frame, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const springIn = ({
  frame,
  fps,
  delay = 0,
  damping = 18,
  stiffness = 150,
  mass = 0.78,
}: {
  frame: number;
  fps: number;
  delay?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
}) =>
  spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {damping, stiffness, mass},
    durationInFrames: 34,
  });

export const sceneOpacity = (
  frame: number,
  duration: number,
  fadeIn = 12,
  fadeOut = 14,
) => {
  const enter = fadeIn === 0 ? 1 : linear(frame, [0, fadeIn], [0, 1]);
  const exit =
    fadeOut === 0
      ? 1
      : linear(frame, [duration - fadeOut, duration], [1, 0]);
  return Math.min(enter, exit);
};

export const overshoot = (value: number) =>
  1 + Math.sin(value * Math.PI) * (1 - value) * 0.035;
