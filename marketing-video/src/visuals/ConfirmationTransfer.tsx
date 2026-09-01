import React from "react";
import {interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {clamp, linear, springIn} from "../animation";
import {COLORS, SHADOWS} from "../theme";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  ScissorsIcon,
} from "../components/Icons";

export const ConfirmationTransfer: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const confirmationIn = springIn({
    frame,
    fps,
    delay: 7,
    damping: 18,
    stiffness: 126,
  });
  const confirmationOut = linear(frame, [37, 54], [1, 0]);
  const calendarIn = springIn({
    frame,
    fps,
    delay: 30,
    damping: 21,
    stiffness: 108,
    mass: 0.92,
  });
  const bookingIn = springIn({
    frame,
    fps,
    delay: 55,
    damping: 17,
    stiffness: 152,
  });
  const statusIn = springIn({
    frame,
    fps,
    delay: 73,
    damping: 18,
    stiffness: 148,
  });
  const halo = interpolate(Math.sin(frame / 5), [-1, 1], [0.94, 1.06]);

  return (
    <div style={{position: "absolute", inset: 0}}>
      <div
        style={{
          position: "absolute",
          left: 82,
          top: 635,
          width: 916,
          height: 930,
          borderRadius: 38,
          border: `1px solid ${COLORS.border}`,
          background: "rgba(9,9,9,.97)",
          boxShadow: SHADOWS.lifted,
          overflow: "hidden",
          opacity: clamp(calendarIn, [0, 0.24], [0, 1]),
          transform: `translateY(${(1 - calendarIn) * 82}px) scale(${0.95 + calendarIn * 0.05})`,
        }}
      >
        <div
          style={{
            height: 108,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 29px",
            borderBottom: `1px solid ${COLORS.border}`,
            background: "#151515",
          }}
        >
          <div style={{display: "flex", alignItems: "center", gap: 15}}>
            <div
              style={{
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.brandBright,
                borderRadius: 15,
                border: "1px solid rgba(206,93,69,.3)",
                background: COLORS.brandSoft,
              }}
            >
              <CalendarIcon size={25} />
            </div>
            <div>
              <div style={{fontSize: 24, fontWeight: 600}}>Денешен распоред</div>
              <div style={{marginTop: 5, color: COLORS.muted, fontSize: 14}}>
                Среда · 09 септември
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              color: COLORS.success,
              fontSize: 13,
              borderRadius: 999,
              border: "1px solid rgba(89,200,121,.28)",
              background: COLORS.successSoft,
              opacity: clamp(statusIn, [0, 0.25], [0, 1]),
            }}
          >
            <CheckIcon size={15} strokeWidth={2.6} />
            Ажурирано
          </div>
        </div>

        <div
          style={{
            height: 72,
            display: "grid",
            gridTemplateColumns: "92px 1fr 1fr",
            borderBottom: `1px solid ${COLORS.border}`,
            background: "rgba(17,17,17,.95)",
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
                gap: 9,
                color: COLORS.soft,
                fontSize: 16,
                fontWeight: 600,
                borderLeft: `1px solid ${COLORS.border}`,
              }}
            >
              <span
                style={{
                  width: 31,
                  height: 31,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: index === 0 ? COLORS.brandBright : COLORS.success,
                  borderRadius: 11,
                  background:
                    index === 0 ? COLORS.brandSoft : COLORS.successSoft,
                  fontSize: 13,
                }}
              >
                {name[0]}
              </span>
              {name}
            </div>
          ))}
        </div>

        <div style={{position: "relative", height: 750}}>
          <span
            style={{
              position: "absolute",
              left: 92,
              top: 0,
              bottom: 0,
              width: 1,
              background: COLORS.border,
            }}
          />
          <span
            style={{
              position: "absolute",
              left: 504,
              top: 0,
              bottom: 0,
              width: 1,
              background: COLORS.border,
            }}
          />

          {["12:00", "13:00", "14:00", "15:00", "16:00", "17:00"].map(
            (time, index) => (
              <React.Fragment key={time}>
                <span
                  style={{
                    position: "absolute",
                    left: 16,
                    top: index * 116 + 13,
                    width: 59,
                    color: COLORS.muted,
                    fontSize: 13,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {time}
                </span>
                <span
                  style={{
                    position: "absolute",
                    left: 92,
                    right: 0,
                    top: index * 116,
                    height: 1,
                    background: "rgba(255,255,255,.07)",
                  }}
                />
              </React.Fragment>
            ),
          )}

          <div
            style={{
              position: "absolute",
              left: 110,
              top: 76,
              width: 376,
              height: 100,
              padding: "16px 18px",
              borderRadius: 19,
              border: "1px solid rgba(89,200,121,.27)",
              background: "rgba(89,200,121,.09)",
            }}
          >
            <div style={{color: COLORS.success, fontSize: 13}}>
              12:30 · Третман за лице
            </div>
            <div style={{marginTop: 9, fontSize: 18, fontWeight: 600}}>
              Мила Иванова
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 522,
              top: 306,
              width: 376,
              height: 100,
              padding: "16px 18px",
              borderRadius: 19,
              border: `1px solid ${COLORS.borderSoft}`,
              background: "rgba(255,255,255,.035)",
            }}
          >
            <div style={{color: COLORS.muted, fontSize: 13}}>
              14:45 · Фенирање
            </div>
            <div style={{marginTop: 9, fontSize: 18, fontWeight: 600}}>
              Сара Илиева
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 110,
              top: 423,
              width: 376,
              height: 110,
              padding: "17px 18px",
              borderRadius: 20,
              border: `1px solid ${COLORS.brand}`,
              background: "rgba(206,93,69,.13)",
              boxShadow: SHADOWS.coral,
              opacity: clamp(bookingIn, [0, 0.22], [0, 1]),
              transform: `translateY(${(1 - bookingIn) * -72}px) scale(${0.88 + bookingIn * 0.12})`,
            }}
          >
            <div style={{color: COLORS.brandBright, fontSize: 13}}>
              15:30 · Маникир · 60 мин
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{fontSize: 18, fontWeight: 600}}>Ана Стојановска</span>
              <span
                style={{
                  width: 27,
                  height: 27,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.white,
                  borderRadius: 99,
                  background: COLORS.brand,
                }}
              >
                <CheckIcon size={15} strokeWidth={2.7} />
              </span>
            </div>
          </div>

          <span
            style={{
              position: "absolute",
              left: 236,
              top: 399,
              width: 120,
              height: 120,
              borderRadius: 99,
              border: `2px solid ${COLORS.brand}`,
              opacity: statusIn ? 1 - statusIn : 0,
              transform: `scale(${halo * (0.45 + statusIn * 1.1)})`,
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 176,
          top: 755,
          width: 728,
          height: 525,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "50px 46px",
          textAlign: "center",
          borderRadius: 36,
          border: `1px solid ${COLORS.border}`,
          background: "rgba(15,15,15,.985)",
          boxShadow: SHADOWS.lifted,
          opacity:
            clamp(confirmationIn, [0, 0.25], [0, 1]) * confirmationOut,
          transform: `translateY(${(1 - confirmationIn) * 72 - (1 - confirmationOut) * 52}px) scale(${0.93 + confirmationIn * 0.07 - (1 - confirmationOut) * 0.07})`,
          zIndex: 12,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 108,
            height: 108,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: COLORS.success,
            borderRadius: 99,
            border: "1px solid rgba(89,200,121,.32)",
            background: COLORS.successSoft,
          }}
        >
          <span
            style={{
              position: "absolute",
              inset: -11,
              borderRadius: 99,
              border: "1px solid rgba(89,200,121,.14)",
              transform: `scale(${halo})`,
            }}
          />
          <CheckIcon size={52} strokeWidth={2.3} />
        </div>
        <div
          style={{
            marginTop: 28,
            color: COLORS.success,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Потврдено
        </div>
        <div style={{marginTop: 16, fontSize: 34, fontWeight: 600}}>
          Терминот е зачуван
        </div>
        <div style={{marginTop: 14, color: COLORS.muted, fontSize: 18, lineHeight: 1.5}}>
          Маникир со Елена · Среда во 15:30
        </div>
        <div
          style={{
            marginTop: 31,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "19px 21px",
            borderRadius: 19,
            border: `1px solid ${COLORS.borderSoft}`,
            background: "rgba(255,255,255,.035)",
          }}
        >
          <div style={{display: "flex", alignItems: "center", gap: 12}}>
            <ScissorsIcon size={21} color={COLORS.brandBright} />
            <span style={{fontSize: 16, fontWeight: 600}}>Elena Beauty Studio</span>
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 7, color: COLORS.muted}}>
            <ClockIcon size={17} />
            <span style={{fontSize: 14}}>60 мин</span>
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          right: 58,
          top: 1480,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "15px 19px",
          color: COLORS.soft,
          fontSize: 15,
          fontWeight: 500,
          borderRadius: 18,
          border: "1px solid rgba(206,93,69,.32)",
          background: "rgba(16,16,16,.96)",
          boxShadow: SHADOWS.dark,
          opacity: clamp(statusIn, [0, 0.25], [0, 1]),
          transform: `translateX(${(1 - statusIn) * 55}px)`,
        }}
      >
        <span style={{width: 8, height: 8, borderRadius: 99, background: COLORS.brand}} />
        Нова резервација · Ана во 15:30
      </div>
    </div>
  );
};
