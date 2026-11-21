// The "hold F8" voice playground. Uses the ported grammar, so what you see
// parsed here is what the app would do with the same transcript.
import { parseLenient, parseCommand, toast, explain, normalize } from "./grammar.js";

const WAKE = ["hey wisp", "wisp"];
const EXAMPLES = ["play paper satellites", "hey wisp, next", "puase", "volume forty", "turn on shuffle", "slowed and reverb on", "Blinding Lights", "what's playing", "bass boost", "repeat this one", "necks", "set the volume to 30"];
const RULES = {
  grammar: "Exact grammar",
  soundalike: "Sound-alike fix",
  nearmiss: "One-edit near miss",
  bare: "Bare song name (push-to-talk only)",
  nowake: "No wake word",
  noise: "Whisper noise",
  unknown: "Not a command",
  empty: "—",
};

const ICON = {
  play: '<path d="M7 5v14l11-7z"/>',
  next: '<path d="M6 5v14l9-7zM17 5v14" />',
  previous: '<path d="M18 5v14L9 12zM7 5v14" />',
  pause: '<path d="M8 5v14M16 5v14" />',
  resume: '<path d="M7 5v14l11-7z"/>',
  save: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  vol: '<path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 10v4h4l5 4V6L8 10zM17 9l5 6M22 9l-5 6"/>',
  fx: '<path d="M3 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/>',
  shuffle: '<path d="M3 6h4l10 12h4M3 18h4l3-3.6M14 9.6 17 6h4M18 3l3 3-3 3M18 15l3 3-3 3"/>',
  note: '<path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z"/>',
  find: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
};
const iconFor = (i) => {
  if (!i) return ICON.note;
  return { play: ICON.find, next: ICON.next, previous: ICON.previous, pause: ICON.pause, resume: ICON.resume, save: ICON.save, volumeUp: ICON.vol, volumeDown: ICON.vol, volumeSet: ICON.vol, mute: ICON.mute, slowed: ICON.fx, reverb: ICON.fx, effect: ICON.fx, repeat: ICON.repeat, shuffle: ICON.shuffle, nowPlaying: ICON.note }[i.kind];
};
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const json = (o) => esc(JSON.stringify(o, null, 1).replace(/\n\s*/g, " ")).replace(/(&quot;[a-zA-Z]+&quot;):/g, '<b>$1</b>:');

let sfx = null;
function blip(name) {
  try {
    sfx ??= {};
    const a = (sfx[name] ??= new Audio(`${import.meta.env.BASE_URL}sfx/${name}.wav`));
    a.volume = 0.5; a.currentTime = 0; a.play().catch(() => {});
  } catch { /* sound is a nicety */ }
}

export function mountVoice(root, { compact = false } = {}) {
  if (!root) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  root.innerHTML = `
    <div class="vw__top">
      <button class="vw__key" type="button" aria-describedby="${root.id}-status"><span class="vw__cap"><span>F8</span><small>hold</small></span></button>
      <div class="vw__state">
        <p class="vw__status" id="${root.id}-status" aria-live="polite"><i class="vw__dot"></i><span>Hold F8 (or press and hold the key) and type a command.</span></p>
        <div class="vw__count" aria-hidden="true"><i></i></div>
      </div>
      <div class="vw__mode" role="radiogroup" aria-label="Voice mode">
        <button type="button" role="radio" aria-checked="true" data-mode="ptt">Push-to-talk</button>
        <button type="button" role="radio" aria-checked="false" data-mode="wake">Wake word</button>
      </div>
    </div>
    <form class="vw__form" autocomplete="off">
      <label class="sr" for="${root.id}-in">Command</label>
      <span class="vw__prompt" aria-hidden="true">&gt;</span>
      <input class="vw__in" id="${root.id}-in" type="text" spellcheck="false" maxlength="200" enterkeyhint="go" placeholder="${EXAMPLES[0]}" />
      ${SR ? `<button class="vw__mic" type="button" aria-pressed="false" title="Use your browser's speech engine">Mic</button>` : ""}
      <button class="vw__go" type="submit">Run</button>
    </form>
    <p class="vw__try"><span class="label">Try</span>${EXAMPLES.slice(0, compact ? 6 : 12).map((e) => `<button type="button" class="vw__ex">${esc(e)}</button>`).join("")}</p>
    <div class="vw__out">
      <div class="vw__row"><span class="label">Heard</span><code class="vw__heard">—</code></div>
      <div class="vw__row"><span class="label">Rule</span><span class="vw__rule">—</span></div>
      <div class="vw__row"><span class="label">Intent</span><code class="vw__json">null</code></div>
      <div class="vw__row vw__row--do"><span class="label">Wispify</span><p class="vw__do">Waiting for a command.</p></div>
    </div>
    <div class="vw__toast" aria-hidden="true"><svg viewBox="0 0 24 24"></svg><span></span></div>
    ${compact ? "" : `<div class="vw__log"><p class="label">Session</p><ol></ol></div>`}
    ${SR ? `<p class="vw__fine">Mic uses your browser's own speech recognition, which may go to a server. The app doesn't: it runs Whisper on your PC.</p>` : ""}
  `;
  const $ = (s) => root.querySelector(s);
  const input = $(".vw__in"), key = $(".vw__key"), status = $(".vw__status span"), count = $(".vw__count i");
  const out = { heard: $(".vw__heard"), rule: $(".vw__rule"), json: $(".vw__json"), do: $(".vw__do") };
  const toastEl = $(".vw__toast"), log = $(".vw__log ol");
  let mode = "ptt", holding = false, holdTimer = 0, rec = null, micOn = false, toastTimer = 0;

  const parse = (raw) => {
    if (mode === "wake") {
      const r = parseCommand(raw, WAKE, true);
      if (r.why === "nowake") return { intent: null, how: "nowake" };
      return { intent: r.intent, how: r.intent ? "grammar" : (normalize(raw) ? "unknown" : "empty") };
    }
    return parseLenient(raw, WAKE);
  };

  function render(raw, commit) {
    const text = normalize(raw);
    const r = parse(raw);
    out.heard.textContent = text || "—";
    out.rule.textContent = RULES[r.how] + (r.fixed ? ` → “${r.fixed}”` : "");
    out.json.innerHTML = r.intent ? json(r.intent) : "null";
    root.classList.toggle("is-miss", !r.intent && !!text);
    if (r.how === "nowake") out.do.textContent = "Ignored. In wake-word mode only phrases that start with “Hey Wisp” run, so game voice chat can’t skip your songs.";
    else if (r.intent) out.do.textContent = explain(r.intent);
    else if (text) out.do.textContent = mode === "wake" ? "Nothing runs: after the wake word this isn’t a command." : "Nothing runs. Too short to be a song name and not a command.";
    else out.do.textContent = "Waiting for a command.";
    if (!commit) return;
    if (!text) return;
    if (r.intent) {
      toastEl.querySelector("svg").innerHTML = iconFor(r.intent);
      toastEl.querySelector("span").textContent = toast(r.intent);
      toastEl.classList.remove("show"); void toastEl.offsetWidth; toastEl.classList.add("show");
      clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
      blip("voice-off");
    } else blip("error");
    if (log) {
      const li = document.createElement("li");
      li.innerHTML = `<code>${esc(raw.trim())}</code><span>${r.intent ? esc(toast(r.intent)) : "—"}</span>`;
      log.prepend(li);
      while (log.children.length > 6) log.lastChild.remove();
    }
  }

  function startHold() {
    if (holding) return;
    holding = true;
    root.classList.add("is-hold");
    key.setAttribute("aria-pressed", "true");
    status.textContent = micOn ? "Listening… speak, then let go." : "Listening… type, then let go.";
    input.value = ""; render("", false);
    input.focus({ preventScroll: true });
    count.style.transition = "none"; count.style.transform = "scaleX(1)"; void count.offsetWidth;
    count.style.transition = "transform 10s linear"; count.style.transform = "scaleX(0)";
    clearTimeout(holdTimer); holdTimer = setTimeout(endHold, 10000);
    blip("voice-on");
    if (micOn && rec) { try { rec.start(); } catch {} }
  }
  function endHold() {
    if (!holding) return;
    holding = false;
    clearTimeout(holdTimer);
    root.classList.remove("is-hold");
    key.setAttribute("aria-pressed", "false");
    count.style.transition = "none"; count.style.transform = "scaleX(0)";
    if (micOn && rec) { try { rec.stop(); } catch {} setTimeout(() => finish(), 600); }
    else finish();
  }
  function finish() {
    status.textContent = input.value.trim() ? "Understood. Hold F8 again for another." : "Nothing heard. Hold F8 and type a command.";
    render(input.value, true);
  }

  // live preview while typing
  input.addEventListener("input", () => render(input.value, false));
  $(".vw__form").addEventListener("submit", (e) => { e.preventDefault(); if (holding) endHold(); else finish(); });
  for (const b of root.querySelectorAll(".vw__ex")) b.addEventListener("click", () => { input.value = b.textContent; render(input.value, true); status.textContent = "Example run. Hold F8 to try your own."; });

  // the keycap: press and hold with mouse, pen or touch
  key.addEventListener("pointerdown", (e) => { e.preventDefault(); key.setPointerCapture?.(e.pointerId); startHold(); });
  key.addEventListener("pointerup", endHold);
  key.addEventListener("pointercancel", endHold);
  key.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startHold(); } });
  key.addEventListener("keyup", (e) => { if (e.key === " " || e.key === "Enter") endHold(); });

  // F8 anywhere while the playground is on screen
  let onScreen = false;
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; }).observe(root);
  addEventListener("keydown", (e) => { if (e.key === "F8" && onScreen) { e.preventDefault(); if (!e.repeat) startHold(); } });
  addEventListener("keyup", (e) => { if (e.key === "F8" && holding) { e.preventDefault(); endHold(); } });

  // mode
  for (const b of root.querySelectorAll("[data-mode]")) b.addEventListener("click", () => {
    mode = b.dataset.mode;
    root.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
    input.placeholder = mode === "wake" ? "hey wisp, next" : EXAMPLES[0];
    render(input.value, false);
  });

  // optional browser speech
  const mic = $(".vw__mic");
  if (mic && SR) {
    rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (ev) => { input.value = Array.from(ev.results).map((r) => r[0].transcript).join(" "); render(input.value, false); };
    rec.onerror = () => { status.textContent = "The browser couldn't use the mic. Type instead."; };
    mic.addEventListener("click", () => { micOn = !micOn; mic.setAttribute("aria-pressed", String(micOn)); status.textContent = micOn ? "Mic on. Hold F8 and speak." : "Mic off. Hold F8 and type."; });
  }

  // a typed-out placeholder cycle, only until the visitor interacts
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    let i = 0, stopped = false;
    const stop = () => { stopped = true; };
    root.addEventListener("pointerdown", stop, { once: true });
    input.addEventListener("focus", stop, { once: true });
    const cycle = () => { if (stopped) return; i = (i + 1) % EXAMPLES.length; input.placeholder = EXAMPLES[i]; setTimeout(cycle, 2200); };
    setTimeout(cycle, 2200);
  }
  render("", false);
}
