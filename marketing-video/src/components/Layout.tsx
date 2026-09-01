import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {clamp, springIn} from "../animation";
import {FONTS} from "../fonts";
import {BASE_HEIGHT, BASE_WIDTH, COLORS} from "../theme";
import {BrandLockup} from "./Brand";

export const ScaledCanvas: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const {width, height} = useVideoConfig();
  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.canvas, overflow: "hidden"}}>
      <div
        style={{
          position: "absolute",
          width: BASE_WIDTH,
          height: BASE_HEIGHT,
          left: (width - BASE_WIDTH * scale) / 2,
          top: (height - BASE_HEIGHT * scale) / 2,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          overflow: "hidden",
          fontFamily: FONTS.body,
          color: COLORS.ink,
          background: COLORS.canvas,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const AmbientBackground: React.FC<{
  intensity?: number;
  position?: number;
}> = ({intensity = 1, position = 0}) => {
  const frame = useCurrentFrame();
  const driftX = Math.sin((frame + position * 23) / 74) * 34;
  const driftY = Math.cos((frame + position * 17) / 92) * 18;
  const scale = 1.12 + Math.sin((frame + position * 11) / 110) * 0.012;

  return (
    <AbsoluteFill style={{background: COLORS.black}}>
      <Img
        src={staticFile("assets/abstract-bg.jpg")}
        style={{
          position: "absolute",
          inset: -80,
          width: BASE_WIDTH + 160,
          height: BASE_HEIGHT + 160,
          objectFit: "cover",
          objectPosition: `${48 + position * 2}% center`,
          opacity: 0.43 * intensity,
          filter: "saturate(.76) contrast(1.08) brightness(.84)",
          transform: `translate3d(${driftX}px, ${driftY}px, 0) scale(${scale})`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,5,5,.72) 0%, rgba(5,5,5,.83) 54%, rgba(5,5,5,.96) 100%), radial-gradient(circle at 82% 12%, rgba(206,93,69,.14), transparent 30%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.026,
          backgroundImage:
            "linear-gradient(112deg, transparent 0 48%, rgba(255,255,255,.32) 49%, transparent 50%), linear-gradient(28deg, transparent 0 47%, rgba(255,255,255,.22) 48%, transparent 49%)",
          backgroundSize: "15px 15px, 20px 20px",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,.28) 72%, rgba(0,0,0,.58) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const TopBrand: React.FC<{scene: string}> = ({scene}) => {
  const frame = useCurrentFrame();
  const enter = springIn({frame, fps: 30, delay: 3, damping: 22});

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 30,
        top: 58,
        left: 68,
        right: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        opacity: clamp(enter, [0, 0.25], [0, 1]),
        transform: `translateY(${(1 - enter) * -16}px)`,
      }}
    >
      <BrandLockup size="small" />
      <div
        style={{
          color: "#AAAAAA",
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
        }}
      >
        OPUS · {scene} / 05
      </div>
    </div>
  );
};

export const SceneHeading: React.FC<{
  eyebrow: string;
  primary: string;
  accent: string;
  frame: number;
  description?: string;
  align?: "left" | "center";
}> = ({eyebrow, primary, accent, frame, description, align = "left"}) => {
  const eyebrowIn = springIn({frame, fps: 30, delay: 4, damping: 22});
  const primaryIn = springIn({
    frame,
    fps: 30,
    delay: 9,
    damping: 21,
    stiffness: 125,
  });
  const accentIn = springIn({
    frame,
    fps: 30,
    delay: 14,
    damping: 21,
    stiffness: 125,
  });
  const descriptionIn = springIn({frame, fps: 30, delay: 20, damping: 22});

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 12,
        top: 188,
        left: 68,
        right: 68,
        textAlign: align,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "9px 15px",
          color: "#C9C9C9",
          fontSize: 16,
          fontWeight: 500,
          border: "1px solid #393939",
          borderRadius: 999,
          background: "rgba(16,16,16,.78)",
          opacity: clamp(eyebrowIn, [0, 0.3], [0, 1]),
          transform: `translateY(${(1 - eyebrowIn) * 18}px)`,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 99,
            background: COLORS.brand,
            boxShadow: "0 0 18px rgba(206,93,69,.5)",
          }}
        />
        {eyebrow}
      </div>

      <div style={{marginTop: 27}}>
        <div
          style={{
            color: COLORS.soft,
            fontFamily: FONTS.display,
            fontSize: 72,
            lineHeight: 0.99,
            letterSpacing: "-0.052em",
            fontWeight: 400,
            opacity: clamp(primaryIn, [0, 0.28], [0, 1]),
            transform: `translateY(${(1 - primaryIn) * 38}px)`,
          }}
        >
          {primary}
        </div>
        <div
          style={{
            marginTop: 5,
            color: COLORS.brand,
            fontFamily: FONTS.accent,
            fontSize: 70,
            lineHeight: 1,
            letterSpacing: "-0.045em",
            fontStyle: "italic",
            fontWeight: 500,
            opacity: clamp(accentIn, [0, 0.28], [0, 1]),
            transform: `translateY(${(1 - accentIn) * 42}px)`,
          }}
        >
          {accent}
        </div>
      </div>

      {description ? (
        <div
          style={{
            marginTop: 24,
            maxWidth: align === "center" ? 820 : 880,
            marginLeft: align === "center" ? "auto" : 0,
            marginRight: align === "center" ? "auto" : 0,
            color: "#B9B9B9",
            fontSize: 22,
            lineHeight: 1.42,
            letterSpacing: "-0.015em",
            opacity: clamp(descriptionIn, [0, 0.3], [0, 1]),
            transform: `translateY(${(1 - descriptionIn) * 22}px)`,
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
};

export const SceneNumber: React.FC<{
  number: string;
  progress: number;
}> = () => null;
