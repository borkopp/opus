import React from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {clamp, springIn} from "../animation";
import {FONTS} from "../fonts";
import {COLORS, SHADOWS} from "../theme";
import {ArrowRightIcon} from "../components/Icons";
import {BrandLockup} from "../components/Brand";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const logoIn = springIn({
    frame,
    fps,
    delay: 3,
    damping: 20,
    stiffness: 116,
  });
  const primaryIn = springIn({
    frame,
    fps,
    delay: 10,
    damping: 20,
    stiffness: 122,
  });
  const accentIn = springIn({
    frame,
    fps,
    delay: 16,
    damping: 20,
    stiffness: 122,
  });
  const detailIn = springIn({
    frame,
    fps,
    delay: 22,
    damping: 21,
    stiffness: 120,
  });
  const ctaIn = springIn({
    frame,
    fps,
    delay: 29,
    damping: 18,
    stiffness: 140,
  });

  return (
    <div style={{position: "absolute", inset: 0, color: COLORS.white}}>
      <div
        style={{
          position: "absolute",
          top: 88,
          left: 68,
          right: 68,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#AAAAAA",
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          opacity: clamp(logoIn, [0, 0.25], [0, 1]),
        }}
      >
        <span>За beauty студија</span>
        <span>OPUS · 05 / 05</span>
      </div>

      <div
        style={{
          position: "absolute",
          top: 300,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: clamp(logoIn, [0, 0.25], [0, 1]),
          transform: `translateY(${(1 - logoIn) * 38}px) scale(${0.94 + logoIn * 0.06})`,
          filter: "drop-shadow(0 20px 48px rgba(0,0,0,.42))",
        }}
      >
        <BrandLockup size="large" />
      </div>

      <div
        style={{
          position: "absolute",
          top: 650,
          left: 68,
          right: 68,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: COLORS.soft,
            fontSize: 74,
            lineHeight: 1,
            letterSpacing: "-0.052em",
            fontWeight: 400,
            opacity: clamp(primaryIn, [0, 0.28], [0, 1]),
            transform: `translateY(${(1 - primaryIn) * 42}px)`,
          }}
        >
          Помалку хаос.
        </div>
        <div
          style={{
            marginTop: 11,
            color: COLORS.brand,
            fontFamily: FONTS.accent,
            fontSize: 68,
            lineHeight: 1.04,
            letterSpacing: "-0.045em",
            fontStyle: "italic",
            fontWeight: 500,
            opacity: clamp(accentIn, [0, 0.28], [0, 1]),
            transform: `translateY(${(1 - accentIn) * 44}px)`,
          }}
        >
          Повеќе време за клиентите.
        </div>
        <div
          style={{
            margin: "36px auto 0",
            maxWidth: 720,
            color: "#B9B9B9",
            fontSize: 21,
            lineHeight: 1.5,
            opacity: clamp(detailIn, [0, 0.28], [0, 1]),
            transform: `translateY(${(1 - detailIn) * 26}px)`,
          }}
        >
          Календар, сопствена страница и онлајн резервации во еден јасен
          систем.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 1180,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: clamp(ctaIn, [0, 0.24], [0, 1]),
          transform: `translateY(${(1 - ctaIn) * 40}px)`,
        }}
      >
        <div
          style={{
            minWidth: 455,
            height: 84,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
            padding: "0 32px",
            color: COLORS.white,
            fontSize: 20,
            fontWeight: 600,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${COLORS.brandBright}, ${COLORS.brand})`,
            boxShadow: SHADOWS.coral,
            transform: `scale(${0.94 + ctaIn * 0.06})`,
          }}
        >
          Започни бесплатно
          <ArrowRightIcon size={23} />
        </div>
        <div
          style={{
            marginTop: 25,
            color: "#AAAAAA",
            fontSize: 17,
            fontWeight: 500,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
          }}
        >
          opus.mk
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 68,
          right: 68,
          bottom: 108,
          height: 1,
          background: "rgba(255,255,255,.12)",
          opacity: detailIn,
        }}
      />
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            right: -130,
            bottom: 90 + index * 20,
            width: 490,
            height: 2,
            background: COLORS.brand,
            opacity: 0.7 - index * 0.18,
            transform: `rotate(-18deg) translateX(${(1 - detailIn) * 120}px)`,
            transformOrigin: "right center",
          }}
        />
      ))}
    </div>
  );
};
