// A faithful JavaScript port of Wispify's voice grammar
// (src-tauri/src/commands.rs, v2.1.4). Same normalisation, wake-word
// handling, filler trimming, exact phrases, head-word rules, sound-alikes,
// one-edit near misses and the push-to-talk "bare song name" fallback.
// Output objects match the Rust serde shape: { kind: "...", ... }.

export function normalize(raw) {
  let out = "", lastSpace = true;
  for (const ch of raw) {
    if (ch === "'" || ch === "\u2019" || ch === "`") continue;
    if (/[\p{L}\p{N}]/u.test(ch)) { out += ch.toLowerCase(); lastSpace = false; }
    else if (!lastSpace) { out += " "; lastSpace = true; }
  }
  return out.trim();
}

const NOISE = new Set(["", "blank audio", "music", "silence", "inaudible", "noise", "sound", "applause", "laughter", "thank you", "thanks for watching", "you", "bye", "um", "uh"]);
const isNoise = (t) => NOISE.has(t);

export function stripWake(text, wakeWords) {
  const cands = [];
  for (const word of wakeWords) {
    const w = normalize(word);
    if (!w) continue;
    cands.push(w);
    if (w.includes("wisp")) for (const alt of ["whisp", "wisps", "wispy", "wispify", "whisper", "wist", "wisb", "west"]) cands.push(w.replace("wisp", alt));
  }
  cands.sort((a, b) => b.length - a.length);
  for (const c of cands) {
    if (text === c) return "";
    if (text.startsWith(c) && text.slice(c.length).startsWith(" ")) return text.slice(c.length).trimStart();
  }
  return null;
}

const FILLER_PREFIX = ["please ", "can you ", "could you ", "ok ", "okay ", "hey ", "now ", "just "];
const FILLER_SUFFIX = [" please", " now", " song", " track", " music"];
function trimFiller(t) {
  for (;;) { const b = t; for (const p of FILLER_PREFIX) if (t.startsWith(p)) t = t.slice(p.length); if (t === b) return t; }
}
function trimSuffixFiller(t) {
  for (;;) { const b = t; for (const s of FILLER_SUFFIX) if (t.endsWith(s)) t = t.slice(0, -s.length); if (t === b) return t; }
}
function switchOf(rest) {
  switch (rest.trim()) {
    case "": case "toggle": case "mode": return "toggle";
    case "on": case "enable": case "start": case "yes": return "on";
    case "off": case "disable": case "stop": case "no": return "off";
    default: return null;
  }
}
const NUMBER_WORDS = { zero: 0, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, half: 50, max: 100 };
function parsePercent(rest) {
  rest = rest.trim();
  if (rest.startsWith("to ")) rest = rest.slice(3);
  if (rest.startsWith("at ")) rest = rest.slice(3);
  const first = rest.split(" ")[0];
  if (/^\d+$/.test(first)) { const n = parseInt(first, 10); return n <= 100 ? n : null; }
  return first in NUMBER_WORDS ? NUMBER_WORDS[first] : null;
}

const I = (kind, extra = {}) => ({ kind, ...extra });
const EXACT = new Map();
const add = (list, intent) => list.split("|").forEach((p) => EXACT.set(p, intent));
add("next|skip|next one|skip it|skip this|skip this one|forward|play next|play the next|play next one|play the next one|go next|go to the next|go to next|change it|change|another one|different|skip that|nah|next up", I("next"));
add("previous|back|go back|last|last one|previous one|rewind|play previous|play the previous|before", I("previous"));
add("hold|hold on|pause|stop|wait|pause it|stop it|stop the|pause the|shut up|quiet|hold it", I("pause"));
add("resume|play|continue|unpause|go on|play it|keep playing|start|play again", I("resume"));
add("save|save it|save this|save this one|like|like it|like this|love this|love it|favorite|favourite|add to favorites|add to favourites|add to library|save to library|heart|heart it", I("save"));
add("volume up|louder|turn it up|turn up|increase volume|more volume|up volume|raise volume", I("volumeUp"));
add("volume down|quieter|softer|turn it down|turn down|decrease volume|less volume|lower volume|lower", I("volumeDown"));
add("mute|mute it|silence", I("mute"));
add("max volume|full volume|volume max", I("volumeSet", { value: 100 }));
add("slow it down|make it slowed|slowed and reverb|slowed reverb|slowed plus reverb", I("slowed", { mode: "on" }));
add("normal speed|original|normal|back to normal|effects off|no effects", I("slowed", { mode: "off" }));
add("speed up|speed it up|sped up|faster|speed|speed up mode", I("effect", { effect: "speed", mode: "on" }));
add("nightcore|night core|night mode|nightcore mode|night", I("effect", { effect: "night", mode: "on" }));
add("bass|bass boost|more bass|boost bass|boost the bass|bass up", I("effect", { effect: "bass", mode: "on" }));
add("bass off|no bass|less bass|bass down|bass boost off", I("effect", { effect: "bass", mode: "off" }));
add("repeat|loop|repeat mode", I("repeat", { mode: "cycle" }));
add("repeat one|repeat this|repeat this one|loop this|loop this one|on repeat", I("repeat", { mode: "one" }));
add("repeat all|loop all|repeat queue|loop queue", I("repeat", { mode: "all" }));
add("repeat off|stop repeating|no repeat|loop off", I("repeat", { mode: "off" }));
add("whats playing|what is this|whats this|what is playing|name|what is that", I("nowPlaying"));
// "silence" is noise before it is "mute" (is_noise runs first), exactly like the Rust order.

const PLAY_VERBS = ["play me ", "play some ", "play the song ", "play song ", "play ", "put on ", "listen to ", "search ", "find "];
const alnumCount = (s) => [...s].filter((c) => /[\p{L}\p{N}]/u.test(c)).length;

function parseBody(text) {
  text = trimSuffixFiller(trimFiller(text.trim())).trim();
  if (isNoise(text)) return null;
  const exact = EXACT.get(text);
  if (exact) return { ...exact };
  const head = text.split(" ")[0] || "";
  const tail = text.slice(head.length).trim();
  switch (head) {
    case "shuffle": { const m = switchOf(tail); return m ? I("shuffle", { mode: m }) : null; }
    case "slowed": case "slow": {
      let r = tail;
      if (r.startsWith("and reverb")) r = r.slice(10);
      if (r.startsWith("plus reverb")) r = r.slice(11);
      r = r.trim();
      if (r.startsWith("mode")) r = r.slice(4);
      const m = switchOf(r); return m ? I("slowed", { mode: m }) : null;
    }
    case "reverb": { const m = switchOf(tail); return m ? I("reverb", { mode: m }) : null; }
    case "nightcore": { const m = switchOf(tail); return m ? I("effect", { effect: "night", mode: m }) : null; }
    case "bass": { const r = tail.startsWith("boost") ? tail.slice(5) : tail; const m = switchOf(r); return m ? I("effect", { effect: "bass", mode: m }) : null; }
    case "repeat": case "loop":
      if (["one", "this", "track"].includes(tail)) return I("repeat", { mode: "one" });
      if (["all", "everything", "queue", "on"].includes(tail)) return I("repeat", { mode: "all" });
      if (["off", "none"].includes(tail)) return I("repeat", { mode: "off" });
      return null;
    case "volume":
      if (["up", "higher", "louder"].includes(tail)) return I("volumeUp");
      if (["down", "lower", "quieter"].includes(tail)) return I("volumeDown");
      { const v = parsePercent(tail); return v === null ? null : I("volumeSet", { value: v }); }
    case "turn": {
      const rest = (tail.startsWith("the ") ? tail.slice(4) : tail).trim();
      for (const [verb, mode] of [["on ", "on"], ["off ", "off"]]) {
        if (rest.startsWith(verb)) {
          let target = rest.slice(verb.length);
          target = (target.startsWith("the ") ? target.slice(4) : target).trim();
          switch (target) {
            case "shuffle": return I("shuffle", { mode });
            case "reverb": return I("reverb", { mode });
            case "slowed": case "slowed mode": return I("slowed", { mode });
            case "nightcore": case "night mode": return I("effect", { effect: "night", mode });
            case "bass": case "bass boost": return I("effect", { effect: "bass", mode });
            case "speed up": return I("effect", { effect: "speed", mode });
            case "repeat": return I("repeat", { mode: mode === "on" ? "all" : "off" });
            default: return null;
          }
        }
      }
      if (["volume up", "it up", "up"].includes(rest)) return I("volumeUp");
      if (["volume down", "it down", "down"].includes(rest)) return I("volumeDown");
      return null;
    }
    case "set": {
      if (tail.startsWith("volume")) { const v = parsePercent(tail.slice(6)); return v === null ? null : I("volumeSet", { value: v }); }
      if (tail.startsWith("the volume")) { const v = parsePercent(tail.slice(10)); return v === null ? null : I("volumeSet", { value: v }); }
      return null;
    }
  }
  for (const verb of PLAY_VERBS) {
    if (text.startsWith(verb)) {
      const q = trimSuffixFiller(text.slice(verb.length).trim()).trim();
      return alnumCount(q) >= 2 ? I("play", { query: q }) : null;
    }
  }
  return null;
}

export function parseCommand(raw, wakeWords, requireWake) {
  const text = normalize(raw);
  if (!text || text.length > 200) return { intent: null, why: "empty" };
  const body = stripWake(text, wakeWords);
  if (body === null && requireWake) return { intent: null, why: "nowake", text };
  const b = body === null ? text : body;
  return { intent: parseBody(b), why: "grammar", text, body: b, woke: body !== null };
}

function editDistance(a, b) {
  a = [...a]; b = [...b];
  let prev2 = new Array(b.length + 1).fill(0), prev = [...Array(b.length + 1).keys()], cur = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], prev2[j - 2] + 1);
    }
    prev2 = [...prev]; [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}
const HOMOPHONES = { necks: "next", nex: "next", neck: "next", nest: "next", nixed: "next", skipped: "skip", skips: "skip", pose: "pause", paws: "pause", pours: "pause", pores: "pause", posit: "pause it", positive: "pause it", resumed: "resume", presume: "resume", "re zoom": "resume", shuffled: "shuffle", safe: "save", saved: "save", "louder please": "louder", muted: "mute", repeats: "repeat" };
const FUZZY = ["next", "skip", "previous", "pause", "resume", "save", "louder", "quieter", "mute", "shuffle", "repeat", "nightcore", "volume up", "volume down"];

/** Push-to-talk parse. Returns { intent, how } where `how` names the rule that matched. */
export function parseLenient(raw, wakeWords) {
  const strict = parseCommand(raw, wakeWords, false);
  if (strict.intent) return { intent: strict.intent, how: "grammar", woke: strict.woke };
  const text = normalize(raw);
  const w = stripWake(text, wakeWords);
  const body = trimSuffixFiller(trimFiller((w === null ? text : w).trim())).trim();
  if (!body || isNoise(body) || body.length > 120) return { intent: null, how: isNoise(body) ? "noise" : "empty" };
  if (HOMOPHONES[body]) { const i = parseBody(HOMOPHONES[body]); if (i) return { intent: i, how: "soundalike", fixed: HOMOPHONES[body] }; }
  if (body.split(" ").length <= 2 && [...body].length >= 4) {
    let best = null;
    for (const t of FUZZY) { const d = editDistance(body, t); if (!best || d < best[0]) best = [d, t]; }
    if (best && best[0] <= (best[1].length >= 7 ? 2 : 1)) return { intent: parseBody(best[1]), how: "nearmiss", fixed: best[1] };
  }
  const letters = alnumCount(body), words = body.split(" ").length;
  if (letters >= 4 && (words >= 2 || letters >= 5)) return { intent: I("play", { query: body }), how: "bare" };
  return { intent: null, how: "unknown" };
}

/** Toast text as the overlay shows it (the app prefixes a glyph; here we draw our own icon). */
export function toast(intent) {
  const sw = (m) => (m === "on" ? "on" : m === "off" ? "off" : "toggled");
  switch (intent.kind) {
    case "play": return `Finding \u201c${intent.query.length > 36 ? intent.query.slice(0, 35) + "\u2026" : intent.query}\u201d\u2026`;
    case "next": return "Next";
    case "previous": return "Previous";
    case "pause": return "Paused";
    case "resume": return "Resumed";
    case "save": return "Saved";
    case "volumeUp": return "Volume up";
    case "volumeDown": return "Volume down";
    case "volumeSet": return `Volume ${intent.value}%`;
    case "mute": return "Muted";
    case "slowed": return `Slowed ${sw(intent.mode)}`;
    case "reverb": return `Reverb ${sw(intent.mode)}`;
    case "repeat": return { one: "Repeat one", all: "Repeat all", off: "Repeat off", cycle: "Repeat" }[intent.mode];
    case "shuffle": return `Shuffle ${sw(intent.mode)}`;
    case "effect": return `${{ speed: "Sped up", night: "Nightcore", bass: "Bass boost" }[intent.effect]} ${sw(intent.mode)}`;
    case "nowPlaying": return "Now playing";
  }
  return "";
}

/** Plain-English description of what the player does with an intent. */
export function explain(intent) {
  const sw = (m, what) => (m === "toggle" ? `Flips ${what} to the other state` : `Turns ${what} ${m}`);
  switch (intent.kind) {
    case "play": return `Searches every source for \u201c${intent.query}\u201d and plays the top hit straight away.`;
    case "next": return "Skips to the next song in the queue.";
    case "previous": return "Goes back to the song you actually heard before (it follows history, even on shuffle).";
    case "pause": return "Pauses. \u201cStop\u201d pauses too \u2014 it never wipes your queue.";
    case "resume": return "Carries on from where it paused.";
    case "save": return "Adds the current song to Liked.";
    case "volumeUp": return "Turns the volume up a step.";
    case "volumeDown": return "Turns the volume down a step.";
    case "volumeSet": return `Sets the volume to exactly ${intent.value}%.`;
    case "mute": return "Mutes the player.";
    case "slowed": return `${sw(intent.mode, "Slowed")} while the song keeps playing.`;
    case "reverb": return `${sw(intent.mode, "Reverb")}, live, no restart.`;
    case "repeat": return { one: "Loops this song in place (no re-fetch, no gap).", all: "Repeats the whole queue.", off: "Turns repeat off.", cycle: "Cycles to the next repeat mode." }[intent.mode];
    case "shuffle": return `${sw(intent.mode, "shuffle")}. A shuffle pass plays each song once.`;
    case "effect": return `${sw(intent.mode, { speed: "Speed up", night: "Nightcore", bass: "Bass boost" }[intent.effect])} from the Sound studio.`;
    case "nowPlaying": return "Shows what\u2019s playing in the overlay toast.";
  }
  return "";
}
