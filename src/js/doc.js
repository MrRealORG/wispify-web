import "../css/pages.css";
import "../css/doc.css";
import "./common.js";

/* scroll-spy for the sticky index on long pages */
const links = [...document.querySelectorAll(".doc__nav a[href^='#']")];
const targets = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
if (targets.length) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === `#${e.target.id}`));
      }
    }
  }, { rootMargin: "-20% 0px -70% 0px" });
  targets.forEach((t) => io.observe(t));
  links[0].classList.add("on");
}
/* open a FAQ answer when its anchor is linked */
const openHash = () => { const el = location.hash && document.querySelector(`details${location.hash}`); if (el) el.open = true; };
openHash(); addEventListener("hashchange", openHash);
