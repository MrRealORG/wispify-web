import "../css/base.css";
import "../css/home.css";
import "../css/vw.css";
import { reduced, finePointer, sfx } from "./common.js";
import * as audio from "./audio.js";
import { LYRICS } from "./viz.js";
import { mountVoice } from "./vw.js";
import { initDragScroll } from "./ui.js";

const BASE = import.meta.env.BASE_URL;
const $ = (id) => document.getElementById(id);

/* ── hero: the real widget, rebuilt in HTML ── */
const player = $("player");
const hero = document.querySelector(".hero");
const SONGS = [
  { t: "Low Orbit", a: "Nightglass", art: 0, dur: 204 },
  { t: "Glasshouse", a: "Nightglass", art: 1, dur: 187 },
  { t: "Paper Satellites", a: "Nightglass", art: 2, dur: 221 },
  { t: "Slow Static", a: "Nightglass", art: 3, dur: 196 },
  { t: "Harbour Lights", a: "Nightglass", art: 5, dur: 233 },
  { t: "Afterglow FM", a: "Nightglass", art: 6, dur: 178 },
];
let idx = 0, lastLyric = -1, raf = 0, offset = 0;
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function setSong(i, dir = 1) {
  idx = (i + SONGS.length) % SONGS.length;
  const s = SONGS[idx];
  const cover = $("p-cover");
  cover.classList.add("swap");
  setTimeout(() => {
    cover.onload = () => cover.classList.remove("swap");
    cover.src = `${BASE}img/art${s.art}-512.webp`;
    $("pill-art").src = cover.src;
    if (cover.complete) cover.classList.remove("swap");
    setTimeout(() => cover.classList.remove("swap"), 1200);
  }, reduced ? 0 : 160);
  $("p-title").textContent = s.t;
  $("p-artist").textContent = s.a;
  $("pill-t").textContent = `${s.t} · ${s.a}`;
  $("p-dur").textContent = fmt(s.dur);
  offset = audio.songTime();
  lastLyric = -1;
  if (dir) sfx("pick", 0.3);
  tick(true);
}

function tick(once) {
  const s = SONGS[idx];
  const t = Math.max(0, audio.songTime() - offset);
  $("p-fill").style.width = `${Math.max(2, Math.min(100, (t / s.dur) * 100))}%`;
  $("p-cur").textContent = fmt(t);
  if (audio.isPlaying()) {
    const li = Math.floor(t / (audio.BEAT * 8)) % LYRICS.length;
    if (li !== lastLyric) {
      lastLyric = li;
      const now = $("p-lyric");
      now.classList.add("swap");
      setTimeout(() => { now.textContent = LYRICS[li]; $("p-lyric-next").textContent = LYRICS[(li + 1) % LYRICS.length]; now.classList.remove("swap"); }, reduced ? 0 : 180);
    }
  }
  if (!once && audio.isPlaying()) raf = requestAnimationFrame(() => tick());
}

const playBtn = $("p-play");
const sync = (playing) => {
  player.dataset.playing = String(playing);
  playBtn.setAttribute("aria-pressed", String(playing));
  playBtn.querySelector(".sr").textContent = playing ? "Pause the demo loop" : "Play the demo loop";
  hero.classList.toggle("is-playing", playing);
  $("p-dot").classList.toggle("is-on", playing);
  cancelAnimationFrame(raf);
  if (playing) { offset = 0; lastLyric = -1; tick(); }
};
playBtn.addEventListener("click", () => audio.toggle());
audio.onChange(sync);
document.addEventListener("visibilitychange", () => { if (document.hidden) audio.stop(); });
$("p-next").addEventListener("click", () => setSong(idx + 1));
$("p-prev").addEventListener("click", () => setSong(idx - 1, -1));
for (const b of player.querySelectorAll("[data-toggle]")) {
  b.setAttribute("aria-pressed", "false");
  b.addEventListener("click", () => { b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); sfx("tap", 0.3); });
}
const like = $("p-like");
like.addEventListener("click", () => {
  const on = like.getAttribute("aria-pressed") !== "true";
  like.setAttribute("aria-pressed", String(on));
  if (on) sfx("like", 0.35);
});
const vol = $("p-vol");
const paintVol = () => vol.style.setProperty("--v", `${vol.value}%`);
vol.addEventListener("input", () => { paintVol(); audio.setVolume?.(vol.value / 100); });
paintVol();

/* the ⋯ More menu */
const more = $("p-more"), menu = $("p-menu");
const openMenu = (open) => { more.setAttribute("aria-expanded", String(open)); menu.hidden = !open; if (open) sfx("expand", 0.25); };
more.addEventListener("click", (e) => { e.stopPropagation(); openMenu(menu.hidden); });
document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target)) openMenu(false); });
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !menu.hidden) openMenu(false);
  if (e.key === "/" && !/input|textarea/i.test(document.activeElement?.tagName || "")) { e.preventDefault(); location.href = `${BASE}features/#player`; }
});

/* ── what's inside: the real screen follows the cursor on hover ── */
const prev = $("trk-preview");
if (prev && finePointer && !reduced) {
  const img = prev.querySelector("img");
  const list = document.querySelector(".trk-list");
  const box = () => list.parentElement.getBoundingClientRect();
  let x = 0, y = 0, tx = 0, ty = 0, raf2 = 0, on = false;
  const step = () => {
    x += (tx - x) * 0.18; y += (ty - y) * 0.18;
    prev.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf2 = on || Math.abs(tx - x) > 0.5 ? requestAnimationFrame(step) : 0;
  };
  const aim = (e) => { const b = box(); const w = prev.offsetWidth; tx = Math.min(e.clientX - b.left + 28, b.width - w); ty = e.clientY - b.top - 140; };
  list.addEventListener("pointermove", (e) => { aim(e); if (!raf2) raf2 = requestAnimationFrame(step); });
  for (const a of list.querySelectorAll(".trk")) {
    a.addEventListener("pointerenter", (e) => {
      const name = a.dataset.img;
      const wide = name.startsWith("stage") || name === "pill";
      img.src = `${BASE}img/${name}-${name.startsWith("stage") ? 800 : name === "pill" ? 448 : 440}.webp`;
      prev.classList.toggle("wide", wide);
      if (!on) { aim(e); x = tx; y = ty; }
      on = true; prev.classList.add("on");
      if (!raf2) raf2 = requestAnimationFrame(step);
    });
    a.addEventListener("pointerleave", () => { on = false; prev.classList.remove("on"); });
  }
}

/* ── voice teaser + stage film ── */
mountVoice(document.getElementById("vw-home"), { compact: true });
initDragScroll(document.getElementById("film"));
