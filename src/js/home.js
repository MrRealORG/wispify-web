import "../css/home.css";
import "../css/vw.css";
import { reduced, finePointer } from "./common.js";
import * as audio from "./audio.js";
import { StageCanvas, TEMPLATES, LYRICS } from "./viz.js";
import { mountVoice } from "./vw.js";
import { initPlayButton, initDragScroll } from "./ui.js";

/* ── hero: the Orbit template in the site's colours ── */
const hero = document.querySelector(".hero");
const canvas = document.getElementById("hero-canvas");
const meter = [...document.querySelectorAll("#meter i")];
const lyricEl = document.getElementById("lyric");
const lyricN = document.getElementById("lyric-n");

const layout = (w, h) => {
  if (w < 760) return { cx: w * 0.5, cy: Math.min(h * 0.36, w * 0.62), r: w * 0.24 };
  return { cx: w * 0.655, cy: h * 0.45, r: Math.min(w * 0.125, h * 0.19) };
};
const place = () => {
  const r = canvas.getBoundingClientRect();
  const L = layout(r.width, r.height);
  hero.style.setProperty("--cx", `${L.cx}px`);
  hero.style.setProperty("--cy", `${L.cy}px`);
  hero.style.setProperty("--r", `${L.r}px`);
};
new ResizeObserver(place).observe(canvas);
place();

let lastLyric = -1;
const stage = new StageCanvas(canvas, {
  look: { ...TEMPLATES[0].look, accent: "#d7ff3d", bars: 120, disc: "vinyl", lyrics: false, clock: false, queue: false },
  skin: "site",
  chrome: false,
  layout,
  onFrame({ energy, playing }) {
    const lit = Math.round(Math.min(1, energy * 2.4) * meter.length);
    for (let i = 0; i < meter.length; i++) meter[i].classList.toggle("on", playing && i < lit);
    if (playing) {
      const idx = Math.floor(audio.songTime() / (audio.BEAT * 8)) % LYRICS.length;
      if (idx !== lastLyric) {
        lastLyric = idx;
        lyricEl.classList.remove("swap"); void lyricEl.offsetWidth; lyricEl.classList.add("swap");
        lyricEl.textContent = LYRICS[idx];
        lyricN.textContent = `Lyric 0${idx + 1} / 06 — Low Orbit, Nightglass`;
      }
    }
  },
});
document.fonts?.ready.then(() => stage.resize());
hero.classList.add("is-live");
initPlayButton(document.getElementById("hero-play"), hero);

/* ── tracklist: a real screenshot follows the cursor on hover ── */
const prev = document.getElementById("trk-preview");
if (prev && finePointer && !reduced) {
  const img = prev.querySelector("img");
  const list = document.querySelector(".trk-list");
  let x = 0, y = 0, tx = 0, ty = 0, raf = 0, on = false;
  const tick = () => {
    x += (tx - x) * 0.16; y += (ty - y) * 0.16;
    prev.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = on || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(tick) : 0;
  };
  list.addEventListener("pointermove", (e) => {
    const box = list.parentElement.getBoundingClientRect();
    tx = e.clientX - box.left + 28; ty = e.clientY - box.top - 120;
    if (!raf) raf = requestAnimationFrame(tick);
  });
  for (const a of list.querySelectorAll(".trk")) {
    a.addEventListener("pointerenter", (e) => {
      const name = a.dataset.img;
      const wide = name.startsWith("stage");
      const file = `${import.meta.env.BASE_URL}img/${name}-${wide ? 800 : name === "pill" ? 448 : name === "voice" ? 800 : 440}.webp`;
      img.src = file;
      prev.classList.toggle("wide", wide || name === "pill" || name === "voice");
      if (!on) { const box = list.parentElement.getBoundingClientRect(); x = tx = e.clientX - box.left + 28; y = ty = e.clientY - box.top - 120; }
      on = true; prev.classList.add("on");
      if (!raf) raf = requestAnimationFrame(tick);
    });
    a.addEventListener("pointerleave", () => { on = false; prev.classList.remove("on"); });
  }
}

/* ── voice teaser + stage film ── */
mountVoice(document.getElementById("vw-home"), { compact: true });
initDragScroll(document.getElementById("film"));
