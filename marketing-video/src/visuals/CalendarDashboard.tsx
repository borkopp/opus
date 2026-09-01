import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {clamp, springIn} from "../animation";
import {COLORS, SHADOWS} from "../theme";
import {CalendarIcon, ClockIcon} from "../components/Icons";

const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00"];

const bookings = [
  {
    staff: 0,
    top: 92,
    name: "Ана Стојановска",
    service: "Маникир",
    time: "10:00",
    delay: 28,
    tone: "coral",
  },
  {
    staff: 1,
    top: 212,
    name: "Мила Иванова",
    service: "Третман за лице",
    time: "11:00",
    delay: 37,
    tone: "green",
  },
  {
    staff: 0,
    top: 452,
    name: "Сара Илиева",
    service: "Фенирање",
    time: "13:00",
    delay: 46,
    tone: "neutral",
  },
] as const;

const toneStyle = (tone: (typeof bookings)[number]["tone"]) => {
  if (tone === "green") {
    return {
      color: COLORS.success,
      border: "rgba(89,200,121,.27)",
      background: "rgba(89,200,121,.09)",
    };
  }
  if (tone === "neutral") {
    return {
      color: COLORS.soft,
      border: COLORS.borderSoft,
      background: "rgba(255,255,255,.035)",
    };
  }
  return {
    color: COLORS.brandBright,
    border: "rgba(206,93,69,.33)",
    background: "rgba(206,93,69,.11)",
  };
};

export const CalendarDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const panelIn = springIn({
    frame,
    fps,
    delay: 13,
    damping: 21,
    stiffness: 108,
    mass: 0.92,
  });
  const vacancyIn = springIn({
    frame,
    fps,
    delay: 70,
    damping: 18,
    stiffness: 142,
  });
  const pulse = interpolate(Math.sin(frame / 6), [-1, 1], [0.985, 1.018]);

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: 620,
        width: 936,
        height: 1030,
        borderRadius: 38,
        border: `1px solid ${COLORS.border}`,
        background: "rgba(9,9,9,.96)",
        boxShadow: SHADOWS.lifted,
        overflow: "hidden",
        opacity: clamp(panelIn, [0, 0.24], [0, 1]),
        transform: `translateY(${(1 - panelIn) * 85}px) scale(${0.95 + panelIn * 0.05})`,
      }}
    >
      <div
        style={{
          height: 76,
          display: "flex",
          alignItems: "center",
          padding: "0 26px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: "#151515",
        }}
      >
        <div style={{display: "flex", gap: 9}}>
          {["#EF5B52", "#F2C84B", "#56C878"].map((color) => (
            <span
              key={color}
              style={{width: 11, height: 11, borderRadius: 99, background: color}}
            />
          ))}
        </div>
        <div
          style={{
            margin: "0 auto",
            color: "#777777",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.04em",
          }}
        >
          studio.opus.mk
        </div>
        <div style={{width: 51}} />
      </div>

      <div
        style={{
          height: 108,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 30px",
          borderBottom: `1px solid ${COLORS.border}`,
          background: "rgba(18,18,18,.92)",
        }}
      >
        <div style={{display: "flex", alignItems: "center", gap: 15}}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.brandBright,
              background: COLORS.brandSoft,
              border: "1px solid rgba(206,93,69,.3)",
            }}
          >
            <CalendarIcon size={25} />
          </div>
          <div>
            <div style={{fontSize: 25, fontWeight: 600}}>Календар</div>
            <div style={{marginTop: 4, color: COLORS.muted, fontSize: 14}}>
              Вторник · 08 септември
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "10px 15px",
            color: COLORS.soft,
            fontSize: 14,
            borderRadius: 999,
            border: `1px solid ${COLORS.border}`,
            background: "#101010",
          }}
        >
          Денес
        </div>
      </div>

      <div
        style={{
          height: 76,
          display: "grid",
          gridTemplateColumns: "100px 1fr 1fr",
          borderBottom: `1px solid ${COLORS.border}`,
          background: "rgba(16,16,16,.95)",
        }}
      >
        <div />
        {["Елена", "Марија"].map((name, index) => (
          <div
            key={name}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 11,
              color: COLORS.soft,
              fontSize: 17,
              fontWeight: 600,
              borderLeft: `1px solid ${COLORS.border}`,
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                color: index === 0 ? COLORS.brandBright : COLORS.success,
                background:
                  index === 0 ? COLORS.brandSoft : COLORS.successSoft,
                fontSize: 14,
              }}
            >
              {name[0]}
            </span>
            {name}
          </div>
        ))}
      </div>

      <div style={{position: "relative", height: 770}}>
        <span
          style={{
            position: "absolute",
            left: 100,
            top: 0,
            bottom: 0,
            width: 1,
            background: COLORS.border,
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 518,
            top: 0,
            bottom: 0,
            width: 1,
            background: COLORS.border,
          }}
        />

        {hours.map((hour, index) => (
          <React.Fragment key={hour}>
            <span
              style={{
                position: "absolute",
                left: 18,
                top: index * 120 + 13,
                width: 64,
                color: COLORS.muted,
                fontSize: 13,
                fontVariantNumeric: "tabular-nums",
                textAlign: "right",
              }}
            >
              {hour}
            </span>
            <span
              style={{
                position: "absolute",
                left: 100,
                right: 0,
                top: index * 120,
                height: 1,
                background: "rgba(255,255,255,.07)",
              }}
            />
          </React.Fragment>
        ))}

        {bookings.map((booking) => {
          const enter = springIn({
            frame,
            fps,
            delay: booking.delay,
            damping: 20,
            stiffness: 136,
          });
          const tone = toneStyle(booking.tone);

          return (
            <div
              key={`${booking.staff}-${booking.time}`}
              style={{
                position: "absolute",
                left: booking.staff === 0 ? 118 : 536,
                width: 382,
                top: booking.top,
                height: 102,
                padding: "17px 20px",
                borderRadius: 19,
                border: `1px solid ${tone.border}`,
                background: tone.background,
                opacity: clamp(enter, [0, 0.24], [0, 1]),
                transform: `translateY(${(1 - enter) * 34}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  color: tone.color,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span>{booking.time}</span>
                <span style={{opacity: 0.5}}>·</span>
                <span>{booking.service}</span>
              </div>
              <div style={{marginTop: 9, fontSize: 18, fontWeight: 600}}>
                {booking.name}
              </div>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: 536,
            width: 382,
            top: 575,
            height: 92,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 11,
            color: COLORS.brandBright,
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 18,
            border: `1px dashed ${COLORS.brand}`,
            background: "rgba(206,93,69,.075)",
            boxShadow: "0 0 0 1px rgba(206,93,69,.04) inset",
            opacity: clamp(vacancyIn, [0, 0.25], [0, 1]),
            transform: `scale(${pulse * (0.94 + vacancyIn * 0.06)})`,
          }}
        >
          <ClockIcon size={20} />
          15:30 · слободен термин
        </div>
      </div>
    </div>
  );
};
