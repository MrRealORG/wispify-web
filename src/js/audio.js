// An original demo loop, synthesised live with WebAudio (no audio file, no
// samples): kick, clap, hats, a sub bass, a soft pad and a plucked arp over a
// four-chord loop at 100 BPM. It exists so the Stage visualizers on this site
// have something real to react to. Nothing starts until the visitor presses Play.

const BPM = 100;
const STEP = 60 / BPM / 4; // 16th note
// Am – Fmaj7 – C – G(add9), written as MIDI notes
const CHORDS = [
  { root: 45, tones: [57, 60, 64, 67] },
  { root: 41, tones: [57, 60, 64, 65] },
  { root: 48, tones: [55, 60, 64, 67] },
  { root: 43, tones: [55, 59, 62, 69] },
];
const ARP = [0, 2, 1, 3, 2, 1, 3, 2, 0, 3, 1, 2, 3, 1, 2, 0];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

let ctx = null, master = null, analyser = null, comp = null, noiseBuf = null, padBus = null, verb = null;
let vol = 0.7;
let timer = 0, nextTime = 0, step = 0, startedAt = 0, playing = false;
const listeners = new Set();

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0.0001;
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.004; comp.release.value = 0.2;
  analyser = ctx.createAnalyser();
  analyser.fftSize = 256; // 128 bins, we use the lower 64 like the app
  analyser.smoothingTimeConstant = 0.72;
  master.connect(comp).connect(analyser).connect(ctx.destination);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // a cheap feedback-delay "room" for pad + arp
  verb = ctx.createGain(); verb.gain.value = 0.28;
  const dl = ctx.createDelay(1); dl.delayTime.value = STEP * 3;
  const fb = ctx.createGain(); fb.gain.value = 0.38;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
  verb.connect(dl); dl.connect(lp).connect(fb).connect(dl); lp.connect(master);
  padBus = ctx.createGain(); padBus.gain.value = 1; padBus.connect(master); padBus.connect(verb);
}

function env(g, t, a, peak, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
}

function kick(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  env(g, t, 0.003, 0.95, 0.38);
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.45);
}
function noise(t, type, freq, q, peak, dec, dest = master) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.playbackRate.value = 0.9 + Math.random() * 0.2;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  env(g, t, 0.002, peak, dec);
  s.connect(f).connect(g).connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dec + 0.05);
}
function clap(t) {
  for (let i = 0; i < 3; i++) noise(t + i * 0.011, "bandpass", 1400, 0.9, 0.42, 0.05);
  noise(t + 0.03, "bandpass", 1200, 0.7, 0.3, 0.2, verb);
}
function bass(t, m, len) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = "sawtooth"; o.frequency.value = hz(m - 12);
  f.type = "lowpass"; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(140, t + len); f.Q.value = 6;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + len + 0.02);
}
function pad(t, tones, len) {
  const f = ctx.createBiquadFilter(), g = ctx.createGain();
  f.type = "lowpass"; f.frequency.value = 1100; f.Q.value = 0.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.6); g.gain.setValueAtTime(0.06, t + len - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  f.connect(g).connect(padBus);
  for (const m of tones) for (const det of [-7, 7]) {
    const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz(m); o.detune.value = det;
    o.connect(f); o.start(t); o.stop(t + len + 0.05);
  }
}
function pluck(t, m) {
  const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  o.type = "triangle"; o.frequency.value = hz(m + 12);
  f.type = "lowpass"; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.25);
  env(g, t, 0.004, 0.13, 0.32);
  o.connect(f).connect(g); g.connect(padBus); o.start(t); o.stop(t + 0.4);
}

function schedule(t, s) {
  const inBar = s % 16;
  const bar = Math.floor(s / 16);
  const chord = CHORDS[bar % 4];
  const section = Math.floor(bar / 4) % 4; // 0 intro-ish, 1-3 full
  if (inBar % 4 === 0) kick(t);
  if (section > 0 && inBar === 14 && bar % 2 === 1) kick(t);
  if (inBar === 4 || inBar === 12) clap(t);
  if (inBar % 2 === 0) noise(t, "highpass", 8000, 0.7, inBar % 4 === 2 ? 0.16 : 0.07, 0.04);
  else if (section > 1) noise(t, "highpass", 9500, 0.7, 0.05, 0.03);
  if (inBar === 0) pad(t, chord.tones, STEP * 16);
  if ([0, 3, 6, 8, 11, 14].includes(inBar)) bass(t, chord.root, STEP * (inBar === 14 ? 2 : 2.6));
  if (section > 0) pluck(t, chord.tones[ARP[inBar] % chord.tones.length]);
}

function pump() {
  while (nextTime < ctx.currentTime + 0.12) {
    schedule(nextTime, step);
    nextTime += STEP;
    step++;
  }
}

export function isPlaying() { return playing; }
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((fn) => fn(playing));

export async function play() {
  if (!ctx) build();
  if (ctx.state !== "running") await ctx.resume();
  if (playing) return;
  playing = true;
  step = 0;
  nextTime = ctx.currentTime + 0.06;
  startedAt = nextTime;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(Math.max(0.0001, vol), ctx.currentTime, 0.05);
  pump();
  timer = setInterval(pump, 25);
  emit();
}
export function stop() {
  if (!playing) return;
  playing = false;
  clearInterval(timer);
  master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.06);
  emit();
}
/** 0..1, like the widget's volume slider. */
export function setVolume(v) { vol = Math.max(0, Math.min(1, v)) * 0.95; if (playing && master) master.gain.setTargetAtTime(Math.max(0.0001, vol), ctx.currentTime, 0.05); }
export function toggle() { return playing ? (stop(), false) : play().then(() => true); }

/** Seconds since the loop started (for lyric timing). */
export function songTime() { return playing && ctx ? Math.max(0, ctx.currentTime - startedAt) : 0; }
export const BEAT = 60 / BPM;

const bins = new Uint8Array(128);
/**
 * Fill `out` (length n) with smoothed 0..1 levels from the lower 64 FFT bins,
 * mirrored like the app's radial bars (bass at the top, highs at the bottom).
 * Returns { bass, energy }. When nothing plays, levels decay to rest.
 */
export function levels(out, smooth, mirror = true, rest = null) {
  const n = out.length;
  let bass = 0, energy = 0;
  const live = playing && analyser;
  if (live) analyser.getByteFrequencyData(bins);
  const half = mirror ? Math.ceil(n / 2) : n;
  for (let i = 0; i < n; i++) {
    const k = mirror ? (i < half ? i : n - 1 - i) : i;
    // log-ish spread over bins 1..60
    const b = Math.min(60, Math.floor(1 + Math.pow(k / half, 1.6) * 59));
    let v;
    if (live) { v = bins[b] / 255; v = Math.pow(v, 1.4) * (0.85 + (k / half) * 0.5); }
    else v = rest ? rest[i] : 0;
    const prev = smooth[i];
    smooth[i] = v > prev ? prev + (v - prev) * 0.55 : prev + (v - prev) * 0.12;
    out[i] = Math.min(1, smooth[i]);
    energy += out[i];
  }
  if (live) for (let i = 1; i < 6; i++) bass += bins[i] / 255;
  return { bass: live ? Math.pow(bass / 5, 2) : 0, energy: energy / n };
}

/** A deterministic still spectrum for the poster frame (no audio needed). */
export function posterLevels(out, mirror = true) {
  const n = out.length, half = mirror ? Math.ceil(n / 2) : n;
  for (let i = 0; i < n; i++) {
    const k = mirror ? (i < half ? i : n - 1 - i) : i;
    const x = k / half;
    out[i] = Math.max(0.04, (0.8 - x * 0.62) * (0.62 + 0.38 * Math.sin(k * 1.7) * Math.cos(k * 0.43)));
  }
  return { bass: 0.4, energy: 0.35 };
}
