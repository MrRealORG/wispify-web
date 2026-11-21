// Small shared UI pieces: the demo-loop play button and drag-to-scroll strips.
import * as audio from "./audio.js";

export function initPlayButton(btn, scope = document.documentElement) {
  if (!btn) return;
  const label = btn.querySelector(".sr");
  const sync = (playing) => {
    btn.setAttribute("aria-pressed", String(playing));
    if (label) label.textContent = playing ? "Pause the demo loop" : "Play the demo loop";
    btn.dataset.cursor = playing ? "Pause" : "Play";
    scope.classList.toggle("is-playing", playing);
    document.querySelectorAll(".cursor.on").forEach((c) => (c.textContent = btn.dataset.cursor));
  };
  btn.addEventListener("click", () => audio.toggle());
  audio.onChange(sync);
  sync(audio.isPlaying());
  // the loop never runs in a background tab
  document.addEventListener("visibilitychange", () => { if (document.hidden) audio.stop(); });
}

export function initDragScroll(el) {
  if (!el || !matchMedia("(pointer: fine)").matches) return;
  let down = false, sx = 0, sl = 0, moved = 0;
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    down = true; moved = 0; sx = e.clientX; sl = el.scrollLeft;
    el.classList.add("is-drag");
  });
  addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
    el.scrollLeft = sl - dx;
  });
  addEventListener("pointerup", () => { if (!down) return; down = false; el.classList.remove("is-drag"); });
  el.addEventListener("click", (e) => { if (moved > 6) { e.preventDefault(); e.stopPropagation(); } }, true);
  el.addEventListener("dragstart", (e) => e.preventDefault());
}
