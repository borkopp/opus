import {mkdir, writeFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const sampleRate = 48_000;
const durationSeconds = 20;
const sampleCount = sampleRate * durationSeconds;
const left = new Float64Array(sampleCount);
const right = new Float64Array(sampleCount);
const tau = Math.PI * 2;

let randomState = 0x0f0f2026;
const random = () => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 0xffffffff;
};

const panGains = (pan) => {
  const normalized = (pan + 1) * (Math.PI / 4);
  return [Math.cos(normalized), Math.sin(normalized)];
};

const mix = (index, sample, pan = 0) => {
  if (index < 0 || index >= sampleCount) return;
  const [leftGain, rightGain] = panGains(pan);
  left[index] += sample * leftGain;
  right[index] += sample * rightGain;
};

const envelope = (time, duration, attack = 0.03, release = 0.22) => {
  if (time < 0 || time > duration) return 0;
  const attackValue = Math.min(1, time / Math.max(attack, 0.0001));
  const releaseValue = Math.min(
    1,
    (duration - time) / Math.max(release, 0.0001),
  );
  return Math.max(0, Math.min(attackValue, releaseValue));
};

const addTone = ({
  start,
  duration,
  frequency,
  volume,
  pan = 0,
  attack = 0.02,
  release = 0.25,
  detune = 0,
  shimmer = 0,
}) => {
  const startSample = Math.floor(start * sampleRate);
  const length = Math.floor(duration * sampleRate);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const env = envelope(t, duration, attack, release);
    const carrier =
      Math.sin(tau * (frequency + detune) * t) * 0.72 +
      Math.sin(tau * (frequency * 2 + detune) * t + 0.4) * 0.18 +
      Math.sin(tau * (frequency * 3 + detune) * t + 1.1) * 0.1;
    const motion = 1 + Math.sin(tau * 0.18 * t) * shimmer;
    mix(startSample + i, carrier * env * volume * motion, pan);
  }
};

const addPad = (start, duration, frequencies, volume) => {
  frequencies.forEach((frequency, index) => {
    const pan = (index / Math.max(1, frequencies.length - 1)) * 1.4 - 0.7;
    addTone({
      start,
      duration,
      frequency,
      volume: volume / frequencies.length,
      pan,
      attack: 0.9,
      release: 1.25,
      detune: index % 2 === 0 ? -0.28 : 0.32,
      shimmer: 0.055,
    });
    addTone({
      start,
      duration,
      frequency: frequency / 2,
      volume: volume * 0.22 / frequencies.length,
      pan: -pan * 0.75,
      attack: 1.1,
      release: 1.4,
      detune: index % 2 === 0 ? 0.18 : -0.2,
    });
  });
};

const addPluck = (start, frequency, volume, pan = 0) => {
  const duration = 0.78;
  const startSample = Math.floor(start * sampleRate);
  const length = Math.floor(duration * sampleRate);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const decay = Math.exp(-t * 5.7);
    const attack = Math.min(1, t / 0.008);
    const tone =
      Math.sin(tau * frequency * t) * 0.62 +
      Math.sin(tau * frequency * 2.01 * t) * 0.24 +
      Math.sin(tau * frequency * 3.02 * t) * 0.09;
    mix(startSample + i, tone * decay * attack * volume, pan);
  }
};

const addKick = (start, volume = 0.2) => {
  const duration = 0.42;
  const startSample = Math.floor(start * sampleRate);
  const length = Math.floor(duration * sampleRate);
  let phase = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const frequency = 46 + 82 * Math.exp(-t * 15);
    phase += tau * frequency / sampleRate;
    const env = Math.exp(-t * 8.5) * Math.min(1, t / 0.004);
    const click = (random() * 2 - 1) * Math.exp(-t * 80) * 0.14;
    mix(startSample + i, (Math.sin(phase) + click) * env * volume, 0);
  }
};

const addHat = (start, volume = 0.035, pan = 0) => {
  const duration = 0.1;
  const startSample = Math.floor(start * sampleRate);
  const length = Math.floor(duration * sampleRate);
  let lowPass = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const noise = random() * 2 - 1;
    lowPass += 0.18 * (noise - lowPass);
    const high = noise - lowPass;
    const env = Math.exp(-t * 38) * Math.min(1, t / 0.0015);
    mix(startSample + i, high * env * volume, pan);
  }
};

const addClick = (start, pan = 0, volume = 0.12) => {
  const duration = 0.075;
  const startSample = Math.floor(start * sampleRate);
  const length = Math.floor(duration * sampleRate);
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 62);
    const tone = Math.sin(tau * 1250 * t) * 0.55 + (random() * 2 - 1) * 0.45;
    mix(startSample + i, tone * env * volume, pan);
  }
};

const addWhoosh = (start, duration = 0.48, volume = 0.09, pan = 0) => {
  const startSample = Math.floor(start * sampleRate);
  const length = Math.floor(duration * sampleRate);
  let filtered = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    const progress = t / duration;
    const noise = random() * 2 - 1;
    const smoothing = 0.015 + progress * 0.16;
    filtered += smoothing * (noise - filtered);
    const high = noise - filtered;
    const env = Math.sin(Math.PI * progress) ** 1.8;
    const air = filtered * 0.78 + high * progress * 0.22;
    mix(startSample + i, air * env * volume, pan);
  }
};

const addChime = (start, root, volume = 0.1) => {
  [1, 1.25, 1.5, 2].forEach((ratio, index) => {
    addTone({
      start: start + index * 0.055,
      duration: 1.8 - index * 0.1,
      frequency: root * ratio,
      volume: volume * (1 - index * 0.12),
      pan: -0.45 + index * 0.3,
      attack: 0.008,
      release: 1.45,
      shimmer: 0.08,
    });
  });
};

// Slow harmonic bed: Dm9 → Bbmaj7 → Fadd9 → Cadd9 → Dm9.
addPad(0, 4.4, [146.83, 174.61, 220, 261.63], 0.11);
addPad(3.8, 4.9, [116.54, 146.83, 174.61, 220], 0.105);
addPad(8.1, 5.2, [130.81, 174.61, 196, 261.63], 0.105);
addPad(12.8, 4.9, [130.81, 164.81, 196, 293.66], 0.11);
addPad(17.1, 2.9, [146.83, 174.61, 220, 261.63], 0.135);

const bpm = 110;
const beat = 60 / bpm;
const roots = [73.42, 58.27, 65.41, 65.41, 73.42];
for (let time = 0.54, beatIndex = 0; time < 19.1; time += beat, beatIndex += 1) {
  const section = time < 4 ? 0 : time < 8.3 ? 1 : time < 13.1 ? 2 : time < 17.2 ? 3 : 4;
  addKick(time, beatIndex % 4 === 0 ? 0.16 : 0.115);
  addHat(time + beat / 2, beatIndex % 2 === 0 ? 0.035 : 0.025, beatIndex % 2 ? 0.35 : -0.35);
  if (beatIndex % 2 === 0) {
    addPluck(time + 0.03, roots[section] * (beatIndex % 4 === 0 ? 4 : 5), 0.038, beatIndex % 4 === 0 ? -0.25 : 0.25);
  }
}

// Scene transitions and interaction accents.
[3.58, 8.48, 14.13, 17.23].forEach((time, index) =>
  addWhoosh(time, 0.54, index === 3 ? 0.12 : 0.09, index % 2 ? 0.15 : -0.15),
);
[9.93, 11.7, 13.5, 13.98].forEach((time, index) =>
  addClick(time, index % 2 ? 0.18 : -0.18, index === 3 ? 0.14 : 0.1),
);
addChime(14.45, 523.25, 0.07);
addChime(16.08, 587.33, 0.08);
addChime(17.55, 440, 0.075);

// Gentle master saturation, fades and normalization.
let peak = 0;
for (let i = 0; i < sampleCount; i += 1) {
  const time = i / sampleRate;
  const fadeIn = Math.min(1, time / 0.32);
  const fadeOut = Math.min(1, (durationSeconds - time) / 0.78);
  const masterEnvelope = Math.max(0, Math.min(fadeIn, fadeOut));
  left[i] = Math.tanh(left[i] * 1.28) * masterEnvelope;
  right[i] = Math.tanh(right[i] * 1.28) * masterEnvelope;
  peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
}

const gain = peak > 0 ? 0.88 / peak : 1;
const bytesPerSample = 2;
const channelCount = 2;
const dataSize = sampleCount * channelCount * bytesPerSample;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(channelCount, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * channelCount * bytesPerSample, 28);
buffer.writeUInt16LE(channelCount * bytesPerSample, 32);
buffer.writeUInt16LE(bytesPerSample * 8, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

let offset = 44;
for (let i = 0; i < sampleCount; i += 1) {
  const leftSample = Math.max(-1, Math.min(1, left[i] * gain));
  const rightSample = Math.max(-1, Math.min(1, right[i] * gain));
  buffer.writeInt16LE(Math.round(leftSample * 32767), offset);
  buffer.writeInt16LE(Math.round(rightSample * 32767), offset + 2);
  offset += 4;
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(scriptDirectory, "..", "public", "audio");
await mkdir(outputDirectory, {recursive: true});
const outputPath = join(outputDirectory, "opus-original-score.wav");
await writeFile(outputPath, buffer);

process.stdout.write(`Generated ${outputPath} (${durationSeconds}s, ${sampleRate}Hz stereo)\n`);

