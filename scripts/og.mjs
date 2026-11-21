// Renders the 1200x630 Open Graph cards into public/og/ with the site's own fonts.
import { chromium } from "/workspace/work/wispify/node_modules/@playwright/test/index.mjs";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname;
const OUT = ROOT + "public/og/";
mkdirSync(OUT, { recursive: true });
const font = (f) => `file://${ROOT}public/fonts/${f}`;
const img = (f) => `file://${f}`;
const CARDS = [
  ["home", "Hold F8.<br>Say it.", "A tiny Windows music player you can talk to", "/tmp/og-hero.png"],
  ["features", "Everything<br><i>on the record</i>", "Player · Sound studio · Orbit queue · Pill · Hotkeys", ROOT + "public/img/now-playing-880.webp"],
  ["voice", "Talk to<br>your <i>music</i>", "Offline voice control. Hold F8, say the song.", ROOT + "public/img/settings-voice-880.webp"],
  ["stage", "Stage", "8 live, audio-reactive templates. Fullscreen or wallpaper.", ROOT + "public/img/stage-orbit-1600.webp"],
  ["download", "Get<br>Wispify", "Free for Windows 10 & 11 · installer or portable", ROOT + "public/img/icon-256.png"],
  ["changelog", "Every<br><i>pressing</i>", "What changed in each version", null],
  ["faq", "The <i>manual</i>", "Install, voice, hotkeys, Stage, troubleshooting", null],
  ["about", "Who made<br><i>this</i>", "MrReal / Ahmad Raza · credits & licences", null],
];
const html = ([id, title, sub, pic]) => `<!doctype html><html><head><style>
@font-face{font-family:B;src:url(${font("bricolage.woff2")});font-weight:200 800;font-stretch:75% 100%}
@font-face{font-family:S;src:url(${font("instrument-serif-italic.woff2")});font-style:italic}
@font-face{font-family:M;src:url(${font("jetbrains-mono.woff2")});font-weight:100 800}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#13110e;color:#efe8d8;font-family:B;position:relative;overflow:hidden}
.pic{position:absolute;right:0;top:0;bottom:0;width:${id === "stage" ? "100%" : "52%"};background:url(${pic ? img(pic) : ""}) ${id === "home" ? "68% 45%/auto 135%" : id === "download" ? "center/240px" : id === "stage" ? "center/cover" : "center 18%/86% auto"} no-repeat;${id === "stage" ? "opacity:.55" : ""}}
${id !== "home" && id !== "stage" && id !== "download" ? ".pic{mask-image:linear-gradient(90deg,transparent,#000 40%)}" : ""}
.k{position:absolute;left:56px;top:48px;display:flex;gap:14px;align-items:center;font:600 16px M;letter-spacing:.1em;text-transform:uppercase;color:#a39b8a}
.k svg{width:38px;height:38px}
.k b{color:#efe8d8;font:800 30px B;font-stretch:80%;letter-spacing:-.02em}
h1{position:absolute;left:52px;bottom:118px;font-weight:800;font-stretch:75%;font-size:${id === "stage" ? 230 : 128}px;line-height:.82;letter-spacing:0;text-transform:uppercase}
h1 i{font-family:S;font-weight:400;text-transform:none;color:#d7ff3d;letter-spacing:-.01em;font-stretch:normal}
p{position:absolute;left:56px;bottom:52px;font:500 19px M;letter-spacing:.04em;text-transform:uppercase;color:#d7ff3d}
.bar{position:absolute;right:0;bottom:0;width:100%;height:10px;background:#d7ff3d}
</style></head><body>${pic ? '<div class="pic"></div>' : ""}
<div class="k"><svg viewBox="0 0 40 40" fill="#d7ff3d"><rect x="7" y="14" width="5" height="16" rx="2.5"/><rect x="16" y="7" width="5" height="26" rx="2.5"/><rect x="25" y="16" width="5" height="13" rx="2.5"/><path d="M29.5 11.5c-1.8-.4-2.6-2.4-1.4-3.7 1.2-1.4 3.6-1 4.1.9.4 1.6-.7 3.4-2.7 4-1.4.4-2.8.2-3.8-.4" fill="none" stroke="#d7ff3d" stroke-width="1.8" stroke-linecap="round"/></svg><b>WISPIFY</b>WSP · 2.1.4</div>
<h1>${title}</h1><p>${sub}</p><div class="bar"></div></body></html>`;
const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox", "--allow-file-access-from-files"] });
const pg = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const c of CARDS) {
  const tmp = `/tmp/og-${c[0]}.html`;
  writeFileSync(tmp, html(c));
  await pg.goto(`file://${tmp}`, { waitUntil: "load" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(150);
  await pg.screenshot({ path: `${OUT}${c[0]}.png` });
}
await b.close();
console.log("og done");
