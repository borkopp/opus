import React from "react";
import {
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {clamp, linear, springIn} from "../animation";
import {COLORS, SHADOWS} from "../theme";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  LinkIcon,
  ScissorsIcon,
  UserIcon,
} from "../components/Icons";

const services = [
  {name: "Маникир", detail: "60 мин", price: "1.200 ден."},
  {name: "Третман за лице", detail: "45 мин", price: "1.500 ден."},
  {name: "Фенирање", detail: "40 мин", price: "800 ден."},
] as const;

const Panel: React.FC<{
  index: number;
  progress: number;
  children: React.ReactNode;
}> = ({index, progress, children}) => {
  const distance = Math.abs(index - progress);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: "32px 36px 40px",
        opacity: clamp(distance, [0, 0.72], [1, 0]),
        transform: `translateX(${(index - progress) * 820}px)`,
      }}
    >
      {children}
    </div>
  );
};

const SectionTitle: React.FC<{title: string; detail: string}> = ({
  title,
  detail,
}) => (
  <div>
    <div style={{fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em"}}>
      {title}
    </div>
    <div style={{marginTop: 7, color: COLORS.muted, fontSize: 16}}>{detail}</div>
  </div>
);

export const BookingFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const panelIn = springIn({
    frame,
    fps,
    delay: 12,
    damping: 21,
    stiffness: 108,
    mass: 0.92,
  });
  const panelProgress = interpolate(
    frame,
    [0, 54, 68, 108, 122, 190],
    [0, 0, 1, 1, 2, 2],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"},
  );
  const serviceSelected = frame >= 37;
  const staffSelected = frame >= 92;
  const timeSelected = frame >= 139;
  const buttonPress = linear(frame, [148, 154], [0, 1]);
  const activeStep = panelProgress < 0.6 ? 0 : panelProgress < 1.6 ? 1 : 2;

  return (
    <div
      style={{
        position: "absolute",
        left: 72,
        top: 610,
        width: 936,
        height: 1080,
        borderRadius: 38,
        border: `1px solid ${COLORS.border}`,
        background: "rgba(9,9,9,.97)",
        boxShadow: SHADOWS.lifted,
        overflow: "hidden",
        opacity: clamp(panelIn, [0, 0.24], [0, 1]),
        transform: `translateY(${(1 - panelIn) * 85}px) scale(${0.95 + panelIn * 0.05})`,
      }}
    >
      <div
        style={{
          height: 74,
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
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: COLORS.muted,
            fontSize: 14,
          }}
        >
          <LinkIcon size={16} color={COLORS.brandBright} />
          <span>
            <strong style={{color: COLORS.brandBright, fontWeight: 600}}>
              elena-beauty
            </strong>
            .opus.mk
          </span>
        </div>
        <div style={{width: 51}} />
      </div>

      <div style={{position: "relative", height: 180, overflow: "hidden"}}>
        <Img
          src={staticFile("assets/nail-cover.jpg")}
          style={{width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 44%"}}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(7,7,7,.86), rgba(7,7,7,.27) 70%), linear-gradient(0deg, rgba(7,7,7,.74), transparent 70%)",
          }}
        />
        <div style={{position: "absolute", left: 30, bottom: 25}}>
          <div style={{fontSize: 29, fontWeight: 600}}>Elena Beauty Studio</div>
          <div style={{marginTop: 7, color: "#B9B9B9", fontSize: 15}}>
            Скопје · Центар
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 27,
            bottom: 27,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 13px",
            color: COLORS.success,
            fontSize: 13,
            borderRadius: 999,
            border: "1px solid rgba(89,200,121,.28)",
            background: "rgba(7,7,7,.68)",
          }}
        >
          <span style={{width: 7, height: 7, borderRadius: 99, background: COLORS.success}} />
          Отворено
        </div>
      </div>

      <div
        style={{
          height: 72,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          borderBottom: `1px solid ${COLORS.border}`,
          background: "rgba(17,17,17,.95)",
        }}
      >
        {["Услуга", "Специјалист", "Термин"].map((label, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          return (
            <div
              key={label}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
                color: active || done ? COLORS.soft : COLORS.mutedDark,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              <span
                style={{
                  width: 25,
                  height: 25,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 99,
                  color: active || done ? COLORS.white : COLORS.muted,
                  background: done
                    ? COLORS.success
                    : active
                      ? COLORS.brand
                      : "#242424",
                  fontSize: 12,
                }}
              >
                {done ? <CheckIcon size={14} strokeWidth={2.7} /> : index + 1}
              </span>
              {label}
              {active ? (
                <span
                  style={{
                    position: "absolute",
                    left: 28,
                    right: 28,
                    bottom: 0,
                    height: 2,
                    borderRadius: "2px 2px 0 0",
                    background: COLORS.brand,
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{position: "relative", height: 754, overflow: "hidden"}}>
        <Panel index={0} progress={panelProgress}>
          <SectionTitle
            title="Избери услуга"
            detail="Одбери што сакаш да резервираш."
          />
          <div style={{display: "flex", flexDirection: "column", gap: 14, marginTop: 28}}>
            {services.map((service, index) => {
              const selected = index === 0 && serviceSelected;
              return (
                <div
                  key={service.name}
                  style={{
                    height: 122,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 23px",
                    borderRadius: 22,
                    border: `1px solid ${
                      selected ? COLORS.brand : COLORS.borderSoft
                    }`,
                    background: selected
                      ? "rgba(206,93,69,.11)"
                      : "rgba(255,255,255,.035)",
                    transform: selected ? "scale(1.01)" : "scale(1)",
                  }}
                >
                  <div style={{display: "flex", alignItems: "center", gap: 18}}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 16,
                        color: selected ? COLORS.white : COLORS.muted,
                        background: selected ? COLORS.brand : "#202020",
                      }}
                    >
                      {selected ? (
                        <CheckIcon size={22} strokeWidth={2.6} />
                      ) : (
                        <ScissorsIcon size={21} />
                      )}
                    </div>
                    <div>
                      <div style={{fontSize: 20, fontWeight: 600}}>{service.name}</div>
                      <div
                        style={{
                          marginTop: 7,
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          color: COLORS.muted,
                          fontSize: 14,
                        }}
                      >
                        <ClockIcon size={15} />
                        {service.detail}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      color: selected ? COLORS.brandBright : COLORS.soft,
                      fontSize: 16,
                      fontWeight: 500,
                    }}
                  >
                    {service.price}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel index={1} progress={panelProgress}>
          <SectionTitle
            title="Избери специјалист"
            detail="Кој да се погрижи за твојот термин?"
          />
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginTop: 34}}>
            {["Елена", "Марија"].map((name, index) => {
              const selected = index === 0 && staffSelected;
              return (
                <div
                  key={name}
                  style={{
                    height: 238,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 26,
                    border: `1px solid ${
                      selected ? COLORS.brand : COLORS.borderSoft
                    }`,
                    background: selected
                      ? "rgba(206,93,69,.11)"
                      : "rgba(255,255,255,.035)",
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 26,
                      color: selected ? COLORS.white : COLORS.muted,
                      background: selected ? COLORS.brand : "#202020",
                    }}
                  >
                    {selected ? (
                      <CheckIcon size={32} strokeWidth={2.6} />
                    ) : (
                      <UserIcon size={31} />
                    )}
                  </div>
                  <div style={{marginTop: 22, fontSize: 22, fontWeight: 600}}>{name}</div>
                  <div style={{marginTop: 7, color: COLORS.muted, fontSize: 14}}>
                    Beauty specialist
                  </div>
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 22,
              padding: "17px 20px",
              color: COLORS.muted,
              fontSize: 15,
              borderRadius: 18,
              border: `1px solid ${COLORS.borderSoft}`,
              background: "rgba(255,255,255,.025)",
            }}
          >
            Ќе ги видиш само термините кога избраниот специјалист е слободен.
          </div>
        </Panel>

        <Panel index={2} progress={panelProgress}>
          <SectionTitle
            title="Избери термин"
            detail="Среда · 09 септември"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              marginTop: 32,
            }}
          >
            {["10:00", "11:30", "13:00", "14:30", "15:30", "17:00"].map(
              (time) => {
                const selected = time === "15:30" && timeSelected;
                return (
                  <div
                    key={time}
                    style={{
                      height: 96,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 20,
                      border: `1px solid ${
                        selected ? COLORS.brand : COLORS.border
                      }`,
                      color: selected ? COLORS.white : COLORS.soft,
                      background: selected ? COLORS.brand : "#1B1B1B",
                      fontSize: 20,
                      fontWeight: selected ? 600 : 500,
                      transform: selected ? "scale(1.025)" : "scale(1)",
                      boxShadow: selected ? SHADOWS.coral : "none",
                    }}
                  >
                    {time}
                  </div>
                );
              },
            )}
          </div>
          <div
            style={{
              marginTop: 38,
              height: 78,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              color: COLORS.white,
              fontSize: 18,
              fontWeight: 600,
              borderRadius: 20,
              background: COLORS.brand,
              boxShadow: SHADOWS.coral,
              opacity: timeSelected ? 1 : 0.42,
              transform: `scale(${1 - buttonPress * 0.025})`,
            }}
          >
            Потврди го терминот
            <ArrowRightIcon size={21} />
          </div>
        </Panel>
      </div>
    </div>
  );
};
