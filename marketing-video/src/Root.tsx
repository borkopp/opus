import React from "react";
import {Composition} from "remotion";
import {OpusAd} from "./OpusAd";

export const VIDEO_FPS = 30;
export const VIDEO_DURATION = 20 * VIDEO_FPS;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="OpusAdVertical"
        component={OpusAd}
        durationInFrames={VIDEO_DURATION}
        fps={VIDEO_FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="OpusAdVertical4K"
        component={OpusAd}
        durationInFrames={VIDEO_DURATION}
        fps={VIDEO_FPS}
        width={2160}
        height={3840}
      />
    </>
  );
};

