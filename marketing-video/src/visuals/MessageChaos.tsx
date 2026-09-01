import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {clamp, springIn} from "../animation";
import {FONTS} from "../fonts";
import {COLORS, SHADOWS} from "../theme";
import {MessageIcon} from "../components/Icons";

const messages = [
  {
    name: "Ана",
    initials: "А",
    text: "Имате ли слободно утре?",
    time: "09:42",
    count: 2,
    urgent: false,
  },
  {
    name: "Сара",
    initials: "С",
    text: "Може да го поместиме во 15:30?",
    time: "09:46",
    count: 1,
    urgent: false,
  },
  {
    name: "Ивана",
    initials: "И",
    text: "Откажувам за денес.",
    time: "09:51",
    count: 1,
    urgent: true,
  },
] as const;

export const MessageChaos: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const panelIn = springIn({
    frame,
    fps,
    delay: 15,
    damping: 21,
    stiffness: 112,
    mass: 0.92,
  });
  const pulse = interpolate(Math.sin(frame / 6), [-1, 1], [0.97, 1.035]);

  return (
    <div
      style={{
        position: "absolute",
        left: 92,
        top: 650,
        width: 896,
        height: 900,
        borderRadius: 38,
        border: `1px solid ${COLORS.border}`,
        background: "rgba(12,12,12,.95)",
        boxShadow: SHADOWS.lifted,
        overflow: "hidden",
        opacity: clamp(panelIn, [0, 0.25], [0, 1]),
        transform: `translateY(${(1 - panelIn) * 80}px) scale(${0.95 + panelIn * 0.05})`,
      }}
    >
      <div
        style={{
          height: 104,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 30px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: "rgba(24,24,24,.9)",
        }}
      >
        <div style={{display: "flex", alignItems: "center", gap: 16}}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.brandBright,
              border: "1px solid rgba(206,93,69,.34)",
              background: COLORS.brandSoft,
            }}
          >
            <MessageIcon size={25} />
          </div>
          <div>
            <div style={{fontSize: 24, fontWeight: 600}}>Пораки</div>
            <div style={{marginTop: 4, color: COLORS.muted, fontSize: 15}}>
              Закажувања денес
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            color: COLORS.soft,
            fontSize: 14,
            fontWeight: 500,
            border: "1px solid rgba(206,93,69,.32)",
            borderRadius: 999,
            background: "rgba(206,93,69,.1)",
            transform: `scale(${pulse})`,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 99,
              background: COLORS.brand,
              boxShadow: "0 0 12px rgba(206,93,69,.65)",
            }}
          />
          7 непрочитани
        </div>
      </div>

      <div style={{padding: "22px 26px 0"}}>
        {messages.map((message, index) => {
          const enter = springIn({
            frame,
            fps,
            delay: 29 + index * 13,
            damping: 20,
            stiffness: 132,
          });
          const accent = message.urgent ? COLORS.danger : COLORS.brand;

          return (
            <div
              key={message.name}
              style={{
                position: "relative",
                height: 190,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "0 28px",
                borderRadius: 27,
                border: `1px solid ${
                  message.urgent ? "rgba(228,106,97,.28)" : COLORS.borderSoft
                }`,
                background: message.urgent
                  ? "linear-gradient(105deg, rgba(228,106,97,.09), rgba(21,21,21,.97) 62%)"
                  : "rgba(25,25,25,.94)",
                opacity: clamp(enter, [0, 0.24], [0, 1]),
                transform: `translateX(${(1 - enter) * (index % 2 ? 52 : -52)}px)`,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 26,
                  bottom: 26,
                  width: 3,
                  borderRadius: "0 4px 4px 0",
                  background: accent,
                }}
              />
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.soft,
                  fontFamily: FONTS.display,
                  fontSize: 25,
                  fontWeight: 600,
                  border: `1px solid ${COLORS.border}`,
                  background: "#101010",
                  flex: "0 0 auto",
                }}
              >
                {message.initials}
              </div>
              <div style={{minWidth: 0, flex: 1}}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{fontSize: 24, fontWeight: 600}}>{message.name}</span>
                  <span
                    style={{
                      color: COLORS.muted,
                      fontSize: 15,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {message.time}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 13,
                    color: message.urgent ? "#D98780" : "#B9B9B9",
                    fontSize: 20,
                    lineHeight: 1.35,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {message.text}
                </div>
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 99,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.white,
                  fontSize: 14,
                  fontWeight: 600,
                  background: accent,
                  flex: "0 0 auto",
                }}
              >
                {message.count}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 30,
          right: 30,
          bottom: 24,
          display: "flex",
          justifyContent: "space-between",
          color: COLORS.muted,
          fontSize: 14,
          letterSpacing: "0.04em",
        }}
      >
        <span>ПРАШАЊА · ПРОМЕНИ · ОТКАЖУВАЊА</span>
        <span>09:52</span>
      </div>
    </div>
  );
};
