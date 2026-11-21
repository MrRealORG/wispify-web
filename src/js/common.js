// Shared behaviour for every page: header state, mobile sheet, reveals,
// line-splitting, the contextual cursor and the page-transition fallback.
import "../css/base.css";

export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* header goes solid once the page moves */
const hdr = document.getElementById("hdr");
if (hdr) {
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;left:0;height:40px;width:1px;pointer-events:none";
  document.body.prepend(sentinel);
  new IntersectionObserver(([e]) => hdr.classList.toggle("is-solid", !e.isIntersecting)).observe(sentinel);
}

/* mobile menu sheet */
const menuBtn = document.querySelector(".hdr__menu");
const sheet = document.getElementById("sheet");
if (menuBtn && sheet) {
  const setOpen = (open) => {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.querySelector(".hdr__menu-l").textContent = open ? "Close" : "Menu";
    document.documentElement.classList.toggle("menu-open", open);
    if (open) {
      sheet.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add("is-open")));
      document.body.style.overflow = "hidden";
    } else {
      sheet.classList.remove("is-open");
      document.body.style.overflow = "";
      setTimeout(() => { if (!sheet.classList.contains("is-open")) sheet.hidden = true; }, reduced ? 0 : 260);
    }
  };
  menuBtn.addEventListener("click", () => setOpen(menuBtn.getAttribute("aria-expanded") !== "true"));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) setOpen(false); });
}

/* split [data-split] headings into masked lines (by <br> / .l spans authored in HTML) */
for (const el of document.querySelectorAll("[data-split]")) {
  const parts = el.innerHTML.split(/<br\s*\/?>/i);
  el.innerHTML = parts.map((p, i) => `<span class="split-line" style="--i:${i}"><span>${p.trim()}</span></span>`).join("");
  el.classList.add("will-split");
  if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal-split", "");
}

/* reveals */
const revealables = document.querySelectorAll("[data-reveal], [data-reveal-split]");
if (reduced || !("IntersectionObserver" in window)) {
  revealables.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
  revealables.forEach((el) => {
    // anything in the first screen reveals on load, not on scroll
    if (el.getBoundingClientRect().top < innerHeight) requestAnimationFrame(() => el.classList.add("in"));
    else io.observe(el);
  });
}

/* contextual cursor: a label disc that only appears over [data-cursor] areas */
if (finePointer && !reduced) {
  const cur = document.createElement("div");
  cur.className = "cursor";
  cur.setAttribute("aria-hidden", "true");
  document.body.append(cur);
  let x = -200, y = -200, tx = -200, ty = -200, s = 0.3, ts = 0.3, raf = 0, active = false;
  const tick = () => {
    x += (tx - x) * 0.22; y += (ty - y) * 0.22; s += (ts - s) * 0.18;
    cur.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
    if (active || Math.abs(ts - s) > 0.01) raf = requestAnimationFrame(tick); else raf = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener("pointermove", (e) => {
    tx = e.clientX; ty = e.clientY;
    const zone = e.target.closest?.("[data-cursor]");
    if (zone) {
      const label = zone.getAttribute("data-cursor");
      if (cur.textContent !== label) cur.textContent = label;
      if (!active) { x = tx; y = ty; }
      active = true; ts = 1; cur.classList.add("on"); kick();
    } else if (active) {
      active = false; ts = 0.3; cur.classList.remove("on"); kick();
    }
  }, { passive: true });
  document.addEventListener("pointerleave", () => { active = false; cur.classList.remove("on"); });
}

/* page transitions: native cross-document View Transitions where supported
   (CSS @view-transition), otherwise a short fade-out before navigating. */
const nativeVT = "onpagereveal" in window || CSS.supports?.("view-transition-name: a") && "PageRevealEvent" in window;
if (!nativeVT && !reduced) {
  document.addEventListener("click", (e) => {
    const a = e.target.closest?.("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target && a.target !== "_self") return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    document.documentElement.classList.add("is-leaving");
    setTimeout(() => { location.href = url.href; }, 190);
  });
  addEventListener("pageshow", () => document.documentElement.classList.remove("is-leaving"));
}

/* year-free helper for copy buttons */
export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const t = document.createElement("textarea");
  t.value = text; document.body.append(t); t.select(); document.execCommand("copy"); t.remove();
  return Promise.resolve();
}
