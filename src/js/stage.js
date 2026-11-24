import "../css/base.css";
import "../css/pages.css";
import "../css/stage.css";
import { sfx } from "./common.js";
import { StageCanvas, TEMPLATES } from "./viz.js";
import { initPlayButton } from "./ui.js";
import * as audio from "./audio.js";

const canvas = document.getElementById("stage-canvas");
const list = document.getElementById("tpl-list");
const spec = document.getElementById("spec");
const BASE = import.meta.env.BASE_URL;

const art = new Image();
art.decoding = "async";
art.src = `${BASE}img/art0-512.webp`;

const stage = new StageCanvas(canvas, { look: TEMPLATES[0].look, art, skin: "app", chrome: true });
art.onload = () => stage.setArt(art);
document.fonts?.ready.then(() => stage.resize());

/* the app's CSS-only template thumbnails (TemplateThumb in StageSheet.tsx) */
const thumb = (l) => `<span class="tpl" data-viz="${l.viz}" data-bg="${l.background}" data-disc="${l.disc}" data-lyrics="${l.lyrics ? l.lyricsPos : "off"}" data-title="${l.title}" style="--tpl-accent:${l.accent}" aria-hidden="true">
  <span class="tpl__bg"></span>${l.viz !== "none" ? '<span class="tpl__viz"></span>' : ""}${l.disc !== "none" ? '<span class="tpl__disc"></span>' : ""}${l.lyrics ? '<span class="tpl__lyrics"><i></i><i></i></span>' : ""}${l.title !== "none" ? '<span class="tpl__title"><i></i></span>' : ""}${l.clock ? '<span class="tpl__clock"></span>' : ""}</span>`;
list.innerHTML = TEMPLATES.map((t, i) => `
  <button type="button" class="tpl-card" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}" title="${t.blurb}">
    ${thumb(t.look)}<span class="tpl-card__name">${t.name}</span>
  </button>`).join("");
const btns = [...list.querySelectorAll("button")];

const describe = (l) => [
  l.viz === "none" ? "no visualizer" : `${l.viz} · ${l.bars} ${l.viz === "particles" ? "motes" : l.barStyle === "dots" ? "dots" : "bars"}`,
  l.viz !== "none" && l.barHeight !== 100 ? `height ${l.barHeight}%` : null,
  l.glow ? "glow" : null,
  l.lyrics ? `lyrics ${l.lyricsSize.toUpperCase()} ${l.lyricsPos}` : null,
  l.disc !== "none" ? `disc ${l.disc}${l.discSpin ? " spin" : ""}` : null,
  l.background === "art" ? `blurred art · dim ${l.dim}%` : "solid",
  l.accent.toLowerCase() !== "#ffffff" ? l.accent : null,
].filter(Boolean).join("  ·  ");

function select(i, focus) {
  const t = TEMPLATES[i];
  btns.forEach((b, k) => { b.setAttribute("aria-checked", String(k === i)); b.tabIndex = k === i ? 0 : -1; });
  if (focus) btns[i].focus();
  const go = () => { stage.setLook(t.look); spec.innerHTML = `<b>${t.name}</b> <span>${t.blurb}</span> <em>${describe(t.look)}</em>`; };
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.parentElement.classList.add("swap");
    setTimeout(() => { go(); canvas.parentElement.classList.remove("swap"); }, 140);
  } else go();
}
btns.forEach((b, i) => b.addEventListener("click", () => { select(i); sfx("pick", 0.3); }));
list.addEventListener("keydown", (e) => {
  const cur = btns.findIndex((b) => b.getAttribute("aria-checked") === "true");
  const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  if (d) { e.preventDefault(); select((cur + d + btns.length) % btns.length, true); }
});
select(0);

for (const b of document.querySelectorAll("[data-art]")) {
  b.addEventListener("click", () => {
    document.querySelectorAll("[data-art]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    const img = new Image();
    img.onload = () => stage.setArt(img);
    img.src = `${BASE}img/art${b.dataset.art}-512.webp`;
  });
}

const playBtn = document.getElementById("stage-play");
initPlayButton(playBtn, document.querySelector(".deck"));
// clicking anywhere on the screen toggles too
canvas.addEventListener("click", () => playBtn.click());
const go = document.getElementById("stage-go");
go.addEventListener("click", () => playBtn.click());
const icon = playBtn.querySelector("use");
audio.onChange((p) => {
  go.textContent = p ? "Stop Stage" : "Start Stage";
  go.classList.toggle("is-open", p);
  icon.setAttribute("href", p ? "#i-pause" : "#i-play");
});
const frame = document.getElementById("deck-frame");
for (const b of document.querySelectorAll("[data-show]")) {
  b.addEventListener("click", () => {
    document.querySelectorAll("[data-show]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    frame.classList.toggle("is-wall", b.dataset.show === "wall");
    sfx("tap", 0.3);
  });
}
