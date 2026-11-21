import "./style.css";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

/* ---------- Intro loader (short; skipped on repeat visits and reduced motion) ---------- */
const loader = document.getElementById("loader");
const seen = sessionStorage.getItem("wispify:intro") === "1";
function ready() {
  root.classList.add("is-ready");
  document.body.classList.add("is-ready");
}
if (reduce || seen) {
  loader.classList.add("is-done");
  ready();
} else {
  sessionStorage.setItem("wispify:intro", "1");
  const start = performance.now();
  const finish = () => {
    const wait = Math.max(0, 1100 - (performance.now() - start));
    setTimeout(() => {
      loader.classList.add("is-leaving");
      setTimeout(() => { loader.classList.add("is-done"); ready(); }, 260);
    }, wait);
  };
  if (document.readyState === "complete") finish();
  else window.addEventListener("load", finish, { once: true });
  setTimeout(() => { if (!loader.classList.contains("is-done")) { loader.classList.add("is-done"); ready(); } }, 2600);
}

/* ---------- Nav state ---------- */
const nav = document.getElementById("nav");
const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ---------- Scroll reveals ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }
}, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
document.querySelectorAll(".reveal, .reveal-scale, .reveal-img").forEach((el) => {
  if (el.closest(".hero")) el.classList.add("is-in");
  else io.observe(el);
});

/* ---------- Hero tilt + parallax (transform only, rAF-throttled) ---------- */
const device = document.querySelector("[data-tilt]");
if (device && !reduce && window.matchMedia("(hover: hover)").matches) {
  let raf = 0, tx = 0, ty = 0;
  window.addEventListener("pointermove", (e) => {
    tx = (e.clientX / window.innerWidth - 0.5);
    ty = (e.clientY / window.innerHeight - 0.5);
    if (!raf) raf = requestAnimationFrame(() => {
      raf = 0;
      device.style.setProperty("--ry", `${-8 + tx * 10}deg`);
      device.style.setProperty("--rx", `${4 - ty * 8}deg`);
    });
  }, { passive: true });
}
if (device && !reduce) {
  let raf = 0;
  window.addEventListener("scroll", () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const y = Math.min(window.scrollY, 900);
      device.style.setProperty("--ty", `${y * -0.08}px`);
    });
  }, { passive: true });
}

/* ---------- Card spotlight ---------- */
if (!reduce) document.querySelectorAll(".card").forEach((card) => {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

/* ---------- Marquee: duplicate once for a seamless loop ---------- */
const track = document.querySelector(".marquee__track");
if (track && !reduce) {
  [...track.children].forEach((c) => { const d = c.cloneNode(true); d.setAttribute("aria-hidden", "true"); track.appendChild(d); });
}

/* ---------- Voice typewriter (commands straight from the app's grammar) ---------- */
const sayEl = document.getElementById("say-text");
const phrases = ["play Low Orbit", "next", "volume 40", "slowed on", "like it", "hey wisp, pause", "repeat one", "what's playing"];
if (sayEl && !reduce) {
  let i = 0, visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(sayEl);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  (async function loop() {
    for (;;) {
      if (!visible || document.hidden) { await sleep(400); continue; }
      const p = phrases[i++ % phrases.length];
      for (let n = sayEl.textContent.length; n >= 0; n--) { sayEl.textContent = sayEl.textContent.slice(0, n); await sleep(22); }
      for (let n = 1; n <= p.length; n++) { sayEl.textContent = p.slice(0, n); await sleep(55 + Math.random() * 40); }
      await sleep(1600);
    }
  })();
}

/* ---------- Stage template switcher ---------- */
const tabs = document.querySelector(".tabs");
const ink = document.querySelector(".tabs__ink");
const imgA = document.getElementById("stage-img");
const imgB = document.getElementById("stage-img-next");
const names = { orbit: "Orbit", minimal: "Minimal", vinyl: "Vinyl", wave: "Wave", ring: "Ring", neon: "Neon", cinematic: "Cinematic", particles: "Particles" };
let front = imgA, back = imgB, current = "orbit", autoplay = 0, stageVisible = false;
function placeInk(btn) {
  ink.style.width = `${btn.offsetWidth}px`;
  ink.style.transform = `translateX(${btn.offsetLeft}px)`;
}
function show(t, btn) {
  if (t === current) return;
  current = t;
  tabs.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b === btn)));
  placeInk(btn);
  btn.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduce ? "auto" : "smooth" });
  const src = `./img/stage-${t}-1600.webp`;
  const set = `./img/stage-${t}-800.webp 800w, ./img/stage-${t}-1600.webp 1600w`;
  back.sizes = front.sizes;
  back.srcset = set; back.src = src;
  back.alt = `Stage, ${names[t]} template`;
  const swap = () => {
    back.classList.remove("is-hidden"); back.removeAttribute("aria-hidden");
    front.classList.add("is-hidden"); front.setAttribute("aria-hidden", "true"); front.alt = "";
    [front, back] = [back, front];
  };
  if (back.complete && back.naturalWidth) swap(); else back.addEventListener("load", swap, { once: true });
}
if (tabs) {
  const btns = [...tabs.querySelectorAll("button")];
  requestAnimationFrame(() => placeInk(btns[0]));
  window.addEventListener("resize", () => placeInk(tabs.querySelector('[aria-selected="true"]')));
  btns.forEach((b) => b.addEventListener("click", () => { stopAuto(); show(b.dataset.t, b); }));
  tabs.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = btns.findIndex((b) => b.dataset.t === current);
    const n = btns[(i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length];
    stopAuto(); show(n.dataset.t, n); n.focus();
  });
  // Gentle auto-advance while the Stage is on screen, until the visitor picks one.
  new IntersectionObserver(([e]) => { stageVisible = e.isIntersecting; }, { threshold: 0.4 }).observe(document.querySelector(".stage__frame"));
  if (!reduce) autoplay = setInterval(() => {
    if (!stageVisible || document.hidden) return;
    const i = btns.findIndex((b) => b.dataset.t === current);
    const n = btns[(i + 1) % btns.length];
    show(n.dataset.t, n);
  }, 3800);
  // Warm the cache for the other templates once the section is near.
  const pre = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    pre.disconnect();
    const w = window.innerWidth * (window.devicePixelRatio || 1) > 900 ? 1600 : 800;
    Object.keys(names).forEach((t) => { const im = new Image(); im.src = `./img/stage-${t}-${w}.webp`; });
  }, { rootMargin: "600px" });
  pre.observe(tabs);
}
function stopAuto() { if (autoplay) { clearInterval(autoplay); autoplay = 0; } }

/* ---------- Lightbox ---------- */
const lb = document.getElementById("lightbox");
const lbImg = lb.querySelector("img");
let lastFocus = null;
function openLb(src, alt) {
  lastFocus = document.activeElement;
  lbImg.src = src; lbImg.alt = alt;
  lb.hidden = false;
  requestAnimationFrame(() => lb.classList.add("is-open"));
  lb.querySelector("button").focus();
}
function closeLb() {
  lb.classList.remove("is-open");
  setTimeout(() => { lb.hidden = true; lastFocus?.focus(); }, reduce ? 0 : 250);
}
document.querySelectorAll(".shot__btn").forEach((b) => b.addEventListener("click", () => openLb(b.dataset.full, b.querySelector("img").alt)));
lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".lightbox__close")) closeLb(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !lb.hidden) closeLb(); });

/* ---------- FAQ: one open at a time ---------- */
const faqs = [...document.querySelectorAll(".faq details")];
faqs.forEach((d) => d.addEventListener("toggle", () => { if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; }); }));
