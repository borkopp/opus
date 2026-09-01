import React from "react";
import {staticFile} from "remotion";
import {COLORS} from "../theme";

const logo = staticFile("assets/opus-logo.png");

export const BrandMark: React.FC<{
  size?: number;
  color?: string;
  opacityLayer?: number;
}> = ({size = 58, color = COLORS.brand, opacityLayer = 0.28}) => (
  <svg
    viewBox="0 0 40 48"
    width={(size * 40) / 48}
    height={size}
    aria-hidden="true"
    style={{display: "block", flex: "0 0 auto"}}
  >
    <path
      d="m40 32v-16c0-6.62742-5.3726-12-12-12h-16l-12 12h22c3.3137 0 6 2.6863 6 6v22z"
      fill={color}
      opacity={opacityLayer}
    />
    <path
      d="m.0000014 16-.0000014 16c-.00000058 6.6274 5.37258 12 12 12h16l12-12h-20c-4.4183 0-8-3.5817-8-8v-20z"
      fill={color}
    />
  </svg>
);

const sizeConfig = {
  small: {width: 170, height: 60},
  medium: {width: 232, height: 82},
  large: {width: 342, height: 121},
} as const;

export const BrandLockup: React.FC<{
  color?: string;
  markColor?: string;
  size?: keyof typeof sizeConfig;
}> = ({
  color = COLORS.white,
  markColor = COLORS.brand,
  size = "medium",
}) => {
  const config = sizeConfig[size];
  const scale = config.width / 188;
  const markWidth = 58 * scale;
  const mask = `url("${logo}")`;

  const maskBase: React.CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: `${config.width}px auto`,
    maskSize: `${config.width}px auto`,
  };

  return (
    <div
      aria-label="OPUS"
      style={{
        position: "relative",
        width: config.width,
        height: config.height,
        flex: "0 0 auto",
      }}
    >
      <div
        style={{
          ...maskBase,
          left: 0,
          width: markWidth,
          background: markColor,
          WebkitMaskPosition: "left center",
          maskPosition: "left center",
        }}
      />
      <div
        style={{
          ...maskBase,
          left: markWidth,
          right: 0,
          background: color,
          WebkitMaskPosition: `${-markWidth}px center`,
          maskPosition: `${-markWidth}px center`,
        }}
      />
    </div>
  );
};
