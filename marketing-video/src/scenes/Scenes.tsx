import React from "react";
import {AbsoluteFill, useCurrentFrame} from "remotion";
import {linear, sceneOpacity} from "../animation";
import {COLORS} from "../theme";
import {AmbientBackground, SceneHeading, TopBrand} from "../components/Layout";
import {MessageChaos} from "../visuals/MessageChaos";
import {CalendarDashboard} from "../visuals/CalendarDashboard";
import {BookingFlow} from "../visuals/BookingFlow";
import {ConfirmationTransfer} from "../visuals/ConfirmationTransfer";
import {EndCard} from "../visuals/EndCard";

const SceneShell: React.FC<{
  duration: number;
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
  backgroundPosition?: number;
  backgroundIntensity?: number;
}> = ({
  duration,
  children,
  fadeIn = 12,
  fadeOut = 14,
  backgroundPosition = 0,
  backgroundIntensity = 1,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity(frame, duration, fadeIn, fadeOut),
        background: COLORS.black,
      }}
    >
      <AmbientBackground
        position={backgroundPosition}
        intensity={backgroundIntensity}
      />
      {children}
    </AbsoluteFill>
  );
};

export const ProblemScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  return (
    <SceneShell duration={duration} fadeIn={8} backgroundPosition={0}>
      <TopBrand scene="01" />
      <SceneHeading
        eyebrow="Проблемот"
        primary="Сè уште ги организираш"
        accent="термините преку пораки?"
        description="Промени, прашања и откажувања — расфрлани низ разговори."
        frame={frame}
      />
      <MessageChaos />
    </SceneShell>
  );
};

export const CalendarScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  return (
    <SceneShell duration={duration} backgroundPosition={1}>
      <TopBrand scene="02" />
      <SceneHeading
        eyebrow="Распоредот"
        primary="Сите термини."
        accent="На едно место."
        description="Јасен календар за тебе и твојот тим."
        frame={frame}
      />
      <CalendarDashboard />
    </SceneShell>
  );
};

export const BookingScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  return (
    <SceneShell duration={duration} backgroundPosition={2}>
      <TopBrand scene="03" />
      <SceneHeading
        eyebrow="Онлајн резервација"
        primary="Клиентите резервираат"
        accent="преку твојот линк."
        description="Услуга, специјалист и слободен термин — без јавување."
        frame={frame}
      />
      <BookingFlow />
    </SceneShell>
  );
};

export const ConfirmationScene: React.FC<{duration: number}> = ({duration}) => {
  const frame = useCurrentFrame();
  return (
    <SceneShell duration={duration} backgroundPosition={3}>
      <TopBrand scene="04" />
      <SceneHeading
        eyebrow="Потврдено"
        primary="Терминот веднаш"
        accent="е во календарот."
        description="Новата резервација се појавува во распоредот."
        frame={frame}
      />
      <ConfirmationTransfer />
    </SceneShell>
  );
};

export const FinalScene: React.FC<{duration: number}> = ({duration}) => (
  <SceneShell
    duration={duration}
    fadeIn={9}
    fadeOut={0}
    backgroundPosition={4}
    backgroundIntensity={1.18}
  >
    <EndCard />
  </SceneShell>
);

export const TransitionSweep: React.FC = () => {
  const frame = useCurrentFrame();
  const move = linear(frame, [0, 17], [-520, 1370]);
  const veil = Math.min(
    linear(frame, [0, 7], [0, 1]),
    linear(frame, [10, 17], [1, 0]),
  );

  return (
    <AbsoluteFill style={{pointerEvents: "none"}}>
      <AbsoluteFill
        style={{
          opacity: veil,
          background:
            "linear-gradient(135deg, rgba(7,7,7,.995), rgba(12,9,8,.99) 58%, rgba(20,11,9,.99))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: move,
          top: -300,
          width: 150,
          height: 2500,
          transform: "rotate(16deg)",
          background:
            "linear-gradient(90deg, transparent, rgba(206,93,69,.08) 25%, rgba(228,138,119,.42) 62%, rgba(255,255,255,.42) 67%, transparent 78%)",
          filter: "blur(1px)",
          opacity: veil,
        }}
      />
    </AbsoluteFill>
  );
};
