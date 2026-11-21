import "../css/pages.css";
import "../css/stage.css";
import "./common.js";
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

list.innerHTML = TEMPLATES.map((t, i) => `
  <button type="button" role="radio" aria-checked="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">
    <span class="tpl__n">T${i + 1}</span><span class="tpl__name">${t.name}</span><span class="tpl__blurb">${t.blurb}</span>
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
  const go = () => { stage.setLook(t.look); spec.textContent = `T${i + 1} ${t.name.toUpperCase()}  ·  ${describe(t.look)}`; };
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    canvas.parentElement.classList.add("swap");
    setTimeout(() => { go(); canvas.parentElement.classList.remove("swap"); }, 140);
  } else go();
}
btns.forEach((b, i) => b.addEventListener("click", () => select(i)));
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
audio.onChange((p) => { canvas.parentElement.dataset.cursor = p ? "Pause" : "Play"; const c = document.querySelector(".cursor.on"); if (c) c.textContent = canvas.parentElement.dataset.cursor; });
