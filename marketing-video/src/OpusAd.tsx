import React from "react";
import {Audio} from "@remotion/media";
import {AbsoluteFill, Sequence, staticFile} from "remotion";
import {ScaledCanvas} from "./components/Layout";
import {
  BookingScene,
  CalendarScene,
  ConfirmationScene,
  FinalScene,
  ProblemScene,
  TransitionSweep,
} from "./scenes/Scenes";

const SCENES = {
  problem: {from: 0, duration: 108},
  calendar: {from: 108, duration: 147},
  booking: {from: 255, duration: 170},
  confirmation: {from: 425, duration: 93},
  final: {from: 518, duration: 82},
} as const;

export const OpusAd: React.FC = () => {
  return (
    <AbsoluteFill>
      <Audio src={staticFile("audio/opus-original-score.wav")} volume={0.82} />
      <ScaledCanvas>
        <Sequence
          from={SCENES.problem.from}
          durationInFrames={SCENES.problem.duration}
        >
          <ProblemScene duration={SCENES.problem.duration} />
        </Sequence>
        <Sequence
          from={SCENES.calendar.from}
          durationInFrames={SCENES.calendar.duration}
        >
          <CalendarScene duration={SCENES.calendar.duration} />
        </Sequence>
        <Sequence
          from={SCENES.booking.from}
          durationInFrames={SCENES.booking.duration}
        >
          <BookingScene duration={SCENES.booking.duration} />
        </Sequence>
        <Sequence
          from={SCENES.confirmation.from}
          durationInFrames={SCENES.confirmation.duration}
        >
          <ConfirmationScene duration={SCENES.confirmation.duration} />
        </Sequence>
        <Sequence
          from={SCENES.final.from}
          durationInFrames={SCENES.final.duration}
        >
          <FinalScene duration={SCENES.final.duration} />
        </Sequence>

        {[108, 255, 425, 518].map((from) => (
          <Sequence key={from} from={from - 5} durationInFrames={18}>
            <TransitionSweep />
          </Sequence>
        ))}
      </ScaledCanvas>
    </AbsoluteFill>
  );
};
