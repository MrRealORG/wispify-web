// Renders the 1200x630 Open Graph cards into public/og/ in the app's own style.
import { chromium } from "/workspace/work/wispify/node_modules/@playwright/test/index.mjs";
import { mkdirSync, writeFileSync } from "node:fs";
const ROOT = new URL("..", import.meta.url).pathname;
const OUT = ROOT + "public/og/";
mkdirSync(OUT, { recursive: true });
const f = (p) => `file://${ROOT}public/${p}`;
const CARDS = [
  ["home", "Hold F8.<br><s>Say the song.</s>", "A tiny Windows music player you can talk to.", "img/now-playing-880.webp", "app"],
  ["features", "Everything<br><s>in one window.</s>", "Player · Sound studio · Orbit queue · Pill · Hotkeys", "img/now-playing-880.webp", "app"],
  ["voice", "Talk to<br><s>your music.</s>", "Offline voice control. Hold F8, say the song.", "img/settings-voice-880.webp", "app"],
  ["stage", "Your music,<br><s>full screen.</s>", "8 live, audio-reactive templates. Fullscreen or wallpaper.", "img/stage-orbit-1600.webp", "wide"],
  ["download", "Get<br><s>Wispify.</s>", "Free for Windows 10 & 11 · installer or portable", "img/logo-256.png", "icon"],
  ["changelog", "Every<br><s>release.</s>", "What changed in each version", "img/logo-256.png", "icon"],
  ["faq", "The<br><s>manual.</s>", "Install, voice, hotkeys, Stage, troubleshooting", "img/logo-256.png", "icon"],
  ["about", "Who made<br><s>this.</s>", "MrReal / Ahmad Raza · ahmadraza.cv", "img/logo-256.png", "icon"],
];
const html = ([id, title, sub, pic, kind]) => `<!doctype html><html><head><style>
@font-face{font-family:W;src:url(${f("fonts/opensans-var.woff2")});font-weight:400 800}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:#08080c;color:rgba(255,255,255,.95);font-family:"Segoe UI Variable Display","Segoe UI",W,sans-serif;position:relative;overflow:hidden}
.k{position:absolute;left:64px;top:56px;display:flex;gap:12px;align-items:center;font-size:24px;font-weight:650;letter-spacing:-.02em}
.k img{width:40px;height:40px;border-radius:10px}
.k span{font-size:18px;font-weight:500;color:rgba(255,255,255,.42);padding-left:12px;border-left:1px solid rgba(255,255,255,.13)}
h1{position:absolute;left:60px;top:188px;font-size:92px;font-weight:700;line-height:1;letter-spacing:-.045em}
h1 s{text-decoration:none;color:rgba(255,255,255,.42)}
p{position:absolute;left:64px;bottom:64px;font-size:23px;color:rgba(255,255,255,.64);max-width:560px;line-height:1.35}
.app{position:absolute;right:70px;top:56px;width:400px;border-radius:26px;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 60px rgba(0,0,0,.6)}
.wide{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55;-webkit-mask-image:linear-gradient(90deg,transparent 15%,#000 75%)}
.icon{position:absolute;right:120px;top:175px;width:280px;height:280px;border-radius:64px}
</style></head><body>
<div class="k"><img src="${f("img/logo-64.png")}"><b style="font-weight:650">wispify</b><span>2.1.4</span></div>
<img class="${kind}" src="${f(pic)}">
<h1>${title}</h1><p>${sub}</p></body></html>`;
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
