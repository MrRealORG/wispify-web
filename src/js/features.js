import "../css/base.css";
import "../css/pages.css";
import "./common.js";

/* hotkeys: hover / focus a row, or press the real combo on this page */
const combo = document.getElementById("combo");
const what = document.getElementById("combo-what");
const buttons = [...document.querySelectorAll("#keylist button")];
const show = (btn, hit) => {
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
  combo.innerHTML = btn.dataset.k.split("+").map((k) => `<kbd>${k}</kbd>`).join("<i>+</i>");
  what.textContent = btn.dataset.what;
  if (hit) { combo.classList.remove("hit"); void combo.offsetWidth; combo.classList.add("hit"); setTimeout(() => combo.classList.remove("hit"), 180); }
};
for (const b of buttons) {
  b.addEventListener("pointerenter", () => show(b));
  b.addEventListener("focus", () => show(b));
  b.addEventListener("click", () => show(b, true));
}
const KEYMAP = { p: "P", n: "N", b: "B", l: "L", s: "S", r: "R", w: "W", v: "V", pageup: "PgUp", pagedown: "PgDn" };
addEventListener("keydown", (e) => {
  let id = null;
  if (e.key === "F8") id = "F8";
  else if (e.ctrlKey && e.altKey && KEYMAP[e.key.toLowerCase()]) id = `Ctrl+Alt+${KEYMAP[e.key.toLowerCase()]}`;
  const btn = id && buttons.find((b) => b.dataset.k === id);
  if (btn) { e.preventDefault(); show(btn, true); }
});
