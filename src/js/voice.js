import "../css/base.css";
import "../css/vw.css";
import "../css/pages.css";
import "../css/voice.css";
import "./common.js";
import { mountVoice } from "./vw.js";

const root = document.getElementById("vw-main");
mountVoice(root, { compact: false });

// every phrase in the command list runs in the playground
for (const b of document.querySelectorAll("[data-say]")) {
  b.addEventListener("click", () => {
    const input = root.querySelector(".vw__in");
    // phrases that only work in push-to-talk need that mode
    root.querySelector('[data-mode="ptt"]').click();
    input.value = b.dataset.say;
    input.dispatchEvent(new Event("input"));
    root.querySelector(".vw__form").requestSubmit();
    root.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  });
}

/* listening modes: the app's segmented control */
const tabs = [...document.querySelectorAll(".modes [role=tab]")];
for (const t of tabs) t.addEventListener("click", () => {
  for (const x of tabs) {
    const on = x === t;
    x.setAttribute("aria-selected", String(on)); x.setAttribute("aria-pressed", String(on));
    document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
  }
});
