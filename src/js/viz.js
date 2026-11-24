// A web port of Wispify's Stage renderer (src/stage/viz/* + stageTemplates.ts
// in the app). Same template presets, same draw approach: one canvas-2D pass
// per frame, glow by double stroke instead of shadowBlur, capped at 60 fps,
// and the loop stops when the music stops or the canvas leaves the screen.
import * as audio from "./audio.js";

const BASE = {
  viz: "radial", accent: "#ffffff", bars: 96, barHeight: 100, barStyle: "line", glow: true,
  lyrics: true, lyricsSize: "l", lyricsPos: "left", clock: true, background: "art", dim: 35, blur: 2,
  disc: "round", discSpin: true, queue: true, title: "none",
};
export const TEMPLATES = [
  { id: "orbit", name: "Orbit", blurb: "Disc, radial bars, lyrics", look: { ...BASE } },
  { id: "minimal", name: "Minimal", blurb: "Just the words", look: { ...BASE, viz: "none", disc: "none", lyricsPos: "center", lyricsSize: "xl", queue: false, dim: 55, title: "corner", glow: false } },
  { id: "vinyl", name: "Vinyl", blurb: "A record that spins", look: { ...BASE, disc: "vinyl", viz: "radial", barStyle: "dots", bars: 72, barHeight: 70, lyricsPos: "bottom", lyricsSize: "m", title: "corner", dim: 45 } },
  { id: "wave", name: "Wave", blurb: "Bars along the floor", look: { ...BASE, viz: "wave", disc: "none", bars: 64, barStyle: "round", lyricsPos: "center", lyricsSize: "l", title: "corner", dim: 45 } },
  { id: "ring", name: "Ring", blurb: "One thin line", look: { ...BASE, viz: "ring", bars: 128, discSpin: false, glow: false, lyricsSize: "m", dim: 45 } },
  { id: "neon", name: "Neon", blurb: "Electric glow", look: { ...BASE, accent: "#7cf7ff", background: "solid", barStyle: "round", bars: 80, barHeight: 120, dim: 0 } },
  { id: "cinematic", name: "Cinematic", blurb: "Big art, quiet title", look: { ...BASE, viz: "wave", barHeight: 45, bars: 96, barStyle: "line", disc: "none", lyrics: true, lyricsPos: "center", lyricsSize: "m", queue: false, title: "bottom", blur: 1, dim: 30, glow: false } },
  { id: "particles", name: "Particles", blurb: "Drifting light", look: { ...BASE, viz: "particles", bars: 70, background: "solid", accent: "#ffd28a", lyricsSize: "m", dim: 0 } },
];

// The demo song's original placeholder lyrics (the same ones used for the app screenshots).
export const LYRICS = [
  "City lights are folding into blue",
  "Every window hums a quiet tune",
  "Hold the moment, let it drift away",
  "We were made of night and lazy days",
  "Turn it up and let the silence go",
  "Wisp of sound, the only thing I know",
];
export const SONG = { title: "Low Orbit", artist: "Nightglass" };

const rgbCache = new Map();
export function rgba(hex, a) {
  let c = rgbCache.get(hex);
  if (!c) { const n = parseInt(hex.slice(1), 16); c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; rgbCache.set(hex, c); }
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
function strokeWithGlow(ctx, width, color, glow) {
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = width * 2.4; ctx.strokeStyle = rgba(color, 0.07); ctx.stroke();
    ctx.lineWidth = width * 1.5; ctx.strokeStyle = rgba(color, 0.12); ctx.stroke();
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.lineWidth = width; ctx.strokeStyle = rgba(color, 0.95); ctx.stroke();
}

/* ── visualizers (ported 1:1 from the app, with tiny layout hooks) ── */
const VIZ = {
  radial({ ctx, cx, cy, r, levels, look }) {
    const n = levels.length, inner = r + r * 0.08, maxLen = r * 0.7 * (look.barHeight / 100);
    const thickness = Math.max(1.5, ((2 * Math.PI * inner) / n) * (look.barStyle === "line" ? 0.42 : 0.5));
    const dots = look.barStyle === "dots";
    ctx.lineCap = look.barStyle === "line" ? "butt" : "round";
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2, cos = Math.cos(a), sin = Math.sin(a);
      const len = 2 + levels[i] * maxLen;
      if (dots) { const d = inner + len; ctx.moveTo(cx + cos * d, cy + sin * d); ctx.lineTo(cx + cos * (d + 0.01), cy + sin * (d + 0.01)); }
      else { ctx.moveTo(cx + cos * inner, cy + sin * inner); ctx.lineTo(cx + cos * (inner + len), cy + sin * (inner + len)); }
    }
    strokeWithGlow(ctx, dots ? thickness * 1.6 : thickness, look.accent, look.glow);
    if (dots) { ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.strokeStyle = rgba(look.accent, 0.18); ctx.stroke(); }
  },
  ring({ ctx, cx, cy, r, levels, look }) {
    const n = levels.length, base = r * 1.12, amp = r * 0.55 * (look.barHeight / 100);
    ctx.lineJoin = "round"; ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const k = i % n, a = -Math.PI / 2 + (k / n) * Math.PI * 2, d = base + levels[k] * amp;
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    strokeWithGlow(ctx, look.barStyle === "line" ? 1.6 : 2.4, look.accent, look.glow);
  },
  wave({ ctx, w, h, levels, look }) {
    const n = levels.length, margin = w * 0.06, left = look.queue ? Math.min(w * 0.3, 430) : margin;
    const span = w - left - margin, slot = span / n, floor = h - h * 0.07, maxH = h * 0.3 * (look.barHeight / 100);
    const width = Math.max(1.5, slot * (look.barStyle === "line" ? 0.5 : 0.62));
    ctx.lineCap = look.barStyle === "line" ? "butt" : "round"; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = left + slot * (i + 0.5), len = 2 + levels[Math.round(Math.abs(i - (n - 1) / 2))] * maxH;
      if (look.barStyle === "dots") { ctx.moveTo(x, floor - len); ctx.lineTo(x, floor - len + 0.01); }
      else { ctx.moveTo(x, floor); ctx.lineTo(x, floor - len); }
    }
    strokeWithGlow(ctx, look.barStyle === "dots" ? width * 1.4 : width, look.accent, look.glow);
    ctx.beginPath(); ctx.moveTo(left, floor + 6); ctx.lineTo(w - margin, floor + 6); ctx.lineWidth = 1; ctx.strokeStyle = rgba(look.accent, 0.12); ctx.stroke();
  },
  particles(f) {
    const { ctx, cx, cy, r, bass, energy, look, dt, playing, levels, P } = f;
    const budget = Math.min(160, Math.round(look.bars * 1.4));
    const spawn = playing ? Math.min(6, Math.floor((0.4 + bass * 5) * dt * 60)) : 0;
    for (let s = 0; s < spawn; s++) {
      const i = P.cursor; P.cursor = (P.cursor + 1) % budget;
      const a = Math.random() * Math.PI * 2, speed = (24 + bass * 160 + Math.random() * 30) * (look.barHeight / 100);
      P.px[i] = cx + Math.cos(a) * r * 1.05; P.py[i] = cy + Math.sin(a) * r * 1.05;
      P.vx[i] = Math.cos(a) * speed; P.vy[i] = Math.sin(a) * speed; P.life[i] = 1; P.size[i] = 0.8 + Math.random() * 2.2;
    }
    const bright = new Path2D(), faint = new Path2D();
    for (let i = 0; i < budget; i++) {
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt * 0.45; P.px[i] += P.vx[i] * dt; P.py[i] += P.vy[i] * dt; P.vx[i] *= 0.995; P.vy[i] *= 0.995;
      const s = P.size[i] * (0.6 + energy) * f.scale;
      (P.life[i] > 0.5 ? bright : faint).rect(P.px[i] - s / 2, P.py[i] - s / 2, s, s);
    }
    ctx.fillStyle = rgba(look.accent, 0.85); ctx.fill(bright);
    ctx.fillStyle = rgba(look.accent, 0.35); ctx.fill(faint);
    let avg = 0; for (let i = 0; i < levels.length; i++) avg += levels[i]; avg /= Math.max(1, levels.length);
    ctx.beginPath(); ctx.arc(cx, cy, r * (1.06 + avg * 0.12), 0, Math.PI * 2);
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgba(look.accent, 0.4 + bass * 0.4); ctx.stroke();
  },
  none() {},
};

function seededParticles(P, cx, cy, r) {
  // poster frame for Particles: a still scatter around the rim
  for (let i = 0; i < 90; i++) {
    const a = (i * 2.399) % (Math.PI * 2), d = r * (1.1 + ((i * 37) % 100) / 100 * 1.6);
    P.px[i] = cx + Math.cos(a) * d; P.py[i] = cy + Math.sin(a) * d; P.vx[i] = P.vy[i] = 0;
    P.life[i] = 0.3 + ((i * 53) % 70) / 100; P.size[i] = 0.8 + ((i * 17) % 22) / 10;
  }
  P.cursor = 90;
}

export class StageCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} opts  { look, art: HTMLImageElement, layout(w,h)->{cx,cy,r}, chrome: bool, skin: "app"|"site" }
   */
  constructor(canvas, opts) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.o = { chrome: true, skin: "app", ...opts };
    this.look = this.o.look;
    this.levels = new Float32Array(this.look.bars);
    this.smooth = new Float32Array(this.look.bars);
    this.rest = new Float32Array(this.look.bars);
    this.P = { px: new Float32Array(160), py: new Float32Array(160), vx: new Float32Array(160), vy: new Float32Array(160), life: new Float32Array(160), size: new Float32Array(160), cursor: 0 };
    this.angle = 0; this.t = 0; this.last = 0; this.raf = 0; this.visible = true; this.settle = 0;
    this.bgCache = null;
    this.lyricIdx = 0; this.lyricFade = 1;
    this.resize = this.resize.bind(this);
    this.frame = this.frame.bind(this);
    new ResizeObserver(this.resize).observe(canvas);
    new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.wake(); }).observe(canvas);
    document.addEventListener("visibilitychange", () => this.wake());
    audio.onChange(() => { this.settle = 90; this.wake(); });
    if (this.o.skin === "app") {
      this.qimgs = [1, 2].map((n) => { const im = new Image(); im.src = `${import.meta.env.BASE_URL}img/art${n}-512.webp`; im.onload = () => this.wake(); return im; });
    }
    this.resize();
  }
  setLook(look) {
    this.look = look;
    if (this.levels.length !== look.bars) { this.levels = new Float32Array(look.bars); this.smooth = new Float32Array(look.bars); this.rest = new Float32Array(look.bars); }
    this.bgCache = null; this.P.cursor = 0; this.P.life.fill(0);
    this.posterSeeded = false;
    this.settle = 2; this.wake();
  }
  setArt(img) { this.o.art = img; this.bgCache = null; this.wake(); }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const r = this.c.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.bgCache = null; this.posterSeeded = false;
    this.settle = Math.max(this.settle, 1);
    this.wake(true);
  }
  wake(now) {
    if (this.raf) return;
    if (now) { this.frame(performance.now()); return; }
    this.raf = requestAnimationFrame(this.frame);
  }
  background() {
    const { ctx, w, h, look } = this;
    if (this.o.skin === "site") { ctx.fillStyle = "#13110e"; ctx.fillRect(0, 0, w, h); return; }
    if (look.background === "art" && this.o.art?.complete && this.o.art.naturalWidth) {
      if (!this.bgCache || this.bgCache.w !== w || this.bgCache.h !== h) {
        // blur once into a small offscreen canvas (half-res like the app), then scale up
        const k = look.blur === 2 ? 0.08 : look.blur === 1 ? 0.18 : 0.5;
        const oc = document.createElement("canvas");
        oc.width = Math.max(8, Math.round(w * k)); oc.height = Math.max(8, Math.round(h * k));
        const o = oc.getContext("2d");
        const s = Math.max(oc.width, oc.height);
        o.filter = `blur(${look.blur === 0 ? 0 : Math.round(s * 0.012) + 1}px)`;
        o.drawImage(this.o.art, (oc.width - s) / 2 - s * 0.05, (oc.height - s) / 2 - s * 0.05, s * 1.1, s * 1.1);
        this.bgCache = { c: oc, w, h };
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(this.bgCache.c, 0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${look.dim / 100})`; ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "#08080b"; ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      g.addColorStop(0, rgba(look.accent, 0.07)); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }
  disc(cx, cy, r) {
    const { ctx, look } = this;
    if (look.disc === "none") return;
    const art = this.o.art;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.angle);
    if (look.disc === "vinyl" || this.o.skin === "site") {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = "#0c0b09"; ctx.fill();
      ctx.lineWidth = 1;
      for (let k = 0.42; k < 0.98; k += 0.035) { ctx.beginPath(); ctx.arc(0, 0, r * k, 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,255,255,${0.03 + (k * 37 % 1) * 0.04})`; ctx.stroke(); }
      // a light sheen that turns with the record
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.97, -0.5, 0.1); ctx.closePath(); ctx.fillStyle = "rgba(255,255,255,0.035)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r * 0.97, Math.PI - 0.5, Math.PI + 0.1); ctx.closePath(); ctx.fill();
      const lr = r * 0.36;
      if (this.o.skin === "site") {
        ctx.beginPath(); ctx.arc(0, 0, lr, 0, Math.PI * 2); ctx.fillStyle = look.accent; ctx.fill();
      } else if (art?.complete && art.naturalWidth) {
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, lr, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(art, -lr, -lr, lr * 2, lr * 2); ctx.restore();
      }
      if (this.o.skin !== "site") { ctx.beginPath(); ctx.arc(0, 0, r * 0.025, 0, Math.PI * 2); ctx.fillStyle = "#0c0b09"; ctx.fill(); }
    } else if (art?.complete && art.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(art, -r, -r, r * 2, r * 2); ctx.restore();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = "#222"; ctx.fill();
    }
    ctx.restore();
  }
  chrome(cx, cy, r) {
    const { ctx, w, h, look } = this;
    const small = w < 640;
    const unit = Math.min(w, h * 1.6);
    ctx.textBaseline = "alphabetic";
    if (look.clock) {
      const d = new Date();
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const date = d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
      const fs = Math.max(18, unit * 0.055);
      ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.font = `300 ${fs}px "Segoe UI Variable Display", "Segoe UI", -apple-system, "Wispify Sans", system-ui, sans-serif`;
      ctx.fillText(time, w - unit * 0.035, unit * 0.035 + fs * 0.85);
      ctx.font = `600 ${Math.max(8, fs * 0.17)}px "Segoe UI Variable Text", "Segoe UI", -apple-system, "Wispify Sans", sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(date, w - unit * 0.035, unit * 0.035 + fs * 1.25);
    }
    if (look.lyrics) {
      const sizes = { s: 0.026, m: 0.036, l: 0.046, xl: 0.068 };
      let fs = unit * sizes[look.lyricsSize] * (small ? 1.25 : 1);
      ctx.font = `800 ${fs}px "Segoe UI Variable Display", "Segoe UI", -apple-system, "Wispify Sans", system-ui, sans-serif`;
      const cur = LYRICS[this.lyricIdx % LYRICS.length].toUpperCase();
      const next = LYRICS[(this.lyricIdx + 1) % LYRICS.length].toUpperCase();
      let x, y, align, maxW;
      if (look.lyricsPos === "left") { align = "left"; x = w * 0.06; maxW = cx - r * 1.9 - x; y = h * 0.36; }
      else if (look.lyricsPos === "center") { align = "center"; x = w / 2; maxW = w * 0.78; y = h * 0.42; }
      else { align = "center"; x = w / 2; maxW = w * 0.8; y = Math.min(h * 0.86, cy + r * 1.95); }
      if (look.lyricsPos === "left" && maxW < fs * 6) { align = "center"; x = w / 2; maxW = w * 0.86; y = h * 0.84; fs *= 0.8; ctx.font = `800 ${fs}px "Segoe UI Variable Display", "Segoe UI", -apple-system, "Wispify Sans", system-ui, sans-serif`; }
      ctx.textAlign = align;
      const lines = wrap(ctx, cur, maxW);
      ctx.fillStyle = `rgba(255,255,255,${0.92 * this.lyricFade})`;
      lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * fs * 1.0));
      const fs2 = fs * 0.62;
      ctx.font = `800 ${fs2}px "Segoe UI Variable Display", "Segoe UI", -apple-system, "Wispify Sans", system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      wrap(ctx, next, maxW).forEach((ln, i) => ctx.fillText(ln, x, y + lines.length * fs + fs * 0.5 + i * fs2 * 1.05));
    }
    if (look.title !== "none") {
      const fs = Math.max(13, unit * 0.022);
      ctx.textAlign = "left";
      const x = w * 0.045, y = look.title === "corner" ? unit * 0.035 + fs : h - unit * 0.06;
      ctx.font = `700 ${fs}px "Segoe UI Variable Display", "Segoe UI", -apple-system, "Wispify Sans", system-ui, sans-serif`; ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(SONG.title, x, y);
      ctx.font = `400 ${fs * 0.8}px "Segoe UI Variable Display", "Segoe UI", -apple-system, "Wispify Sans", system-ui, sans-serif`; ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(SONG.artist, x, y + fs * 1.1);
    }
    if (look.queue && !small) {
      // the orbit queue, simplified: three covers on a curve in the lower-left corner
      const R = Math.min(w, h) * 0.36, ox = -R * 0.3, oy = h + R * 0.42;
      ctx.beginPath(); ctx.arc(ox, oy, R, -Math.PI / 2.05, -0.3); ctx.lineWidth = 1; ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.stroke();
      const names = ["Low Orbit", "Glasshouse", "Paper Satellites"];
      names.forEach((n, i) => {
        const a = -Math.PI / 2 + 0.45 + i * 0.26, px = ox + Math.cos(a) * R, py = oy + Math.sin(a) * R;
        const s = (i === 0 ? 0.075 : 0.055) * Math.min(w, h * 1.4);
        const im = i === 0 ? this.o.art : this.qimgs?.[i - 1];
        roundRect(ctx, px - s / 2, py - s / 2, s, s, s * 0.22);
        if (im?.complete && im.naturalWidth) {
          ctx.save(); ctx.clip(); ctx.globalAlpha = i === 0 ? 1 : 0.55; ctx.drawImage(im, px - s / 2, py - s / 2, s, s); ctx.restore();
        } else { ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fill(); }
        ctx.textAlign = "left"; ctx.font = `700 ${s * 0.3}px "Segoe UI Variable Display", "Segoe UI", -apple-system, "Wispify Sans", sans-serif`;
        ctx.fillStyle = i === 0 ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.5)";
        ctx.fillText(n, px + s * 0.7, py + s * 0.08);
      });
    }
  }
  frame(now) {
    this.raf = 0;
    const playing = audio.isPlaying();
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now; this.t += dt;
    const { ctx, look } = this;
    const L = this.o.layout ? this.o.layout(this.w, this.h) : { cx: this.w / 2, cy: this.h / 2, r: Math.min(this.w, this.h) * 0.17 };
    let bass, energy;
    const usePoster = !playing && this.settle <= 0;
    if (!playing && !this.everPlayed) ({ bass, energy } = audio.posterLevels(this.levels, look.viz !== "wave"));
    else { audio.posterLevels(this.rest, look.viz !== "wave"); ({ bass, energy } = audio.levels(this.levels, this.smooth, true, this.rest)); }
    if (playing) this.everPlayed = true;
    if (playing && look.discSpin) this.angle += dt * (0.35 + bass * 0.6);
    // lyrics: advance every two bars of the demo loop
    if (playing) {
      const idx = Math.floor(audio.songTime() / (audio.BEAT * 8));
      if (idx !== this.lyricIdx) { this.lyricIdx = idx; this.lyricFade = 0; }
      this.lyricFade = Math.min(1, this.lyricFade + dt * 3);
    }
    this.background();
    const pulse = 1 + (playing ? bass * 0.035 : 0);
    const r = L.r * pulse;
    if (look.viz === "particles" && !this.everPlayed && !this.posterSeeded) { seededParticles(this.P, L.cx, L.cy, r); this.posterSeeded = true; }
    VIZ[look.viz]({ ctx, w: this.w, h: this.h, cx: L.cx, cy: L.cy, r, levels: this.levels, bass, energy, look, t: this.t, dt: playing ? dt : 0, playing, P: this.P, scale: Math.max(1, this.w / 1400) });
    this.disc(L.cx, L.cy, r);
    if (this.o.chrome) this.chrome(L.cx, L.cy, r);
    if (this.o.onFrame) this.o.onFrame({ bass, energy, playing });
    if (this.settle > 0) this.settle--;
    const keepGoing = this.visible && !document.hidden && (playing || this.settle > 0) && !usePoster;
    if (keepGoing) this.raf = requestAnimationFrame(this.frame);
  }
}

function wrap(ctx, text, maxW) {
  const words = text.split(" "), lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
