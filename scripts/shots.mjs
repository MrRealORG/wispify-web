// Screenshot every page (desktop + mobile). Usage:
//   node scripts/shots.mjs [outDir] [baseUrl] [pages...]
// Without baseUrl it serves ./dist under /wispify-web/ on a local port.
import { chromium } from "/workspace/work/wispify/node_modules/@playwright/test/index.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const OUT = process.argv[2] || "/workspace/work/sites/shots/wispify-web-v2";
let base = process.argv[3] && process.argv[3] !== "-" ? process.argv[3] : null;
const only = process.argv.slice(4);
mkdirSync(OUT, { recursive: true });
const DIST = new URL("../dist/", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".wav": "audio/wav", ".ico": "image/x-icon", ".txt": "text/plain" };
let server;
if (!base) {
  server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]).replace(/^\/wispify-web/, "");
    if (p.endsWith("/")) p += "index.html";
    let f = join(DIST, p);
    if (!existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404, { "content-type": "text/html" }); return res.end(existsSync(join(DIST, "404.html")) ? readFileSync(join(DIST, "404.html")) : "404"); }
    res.writeHead(200, { "content-type": types[extname(f)] || "application/octet-stream" });
    res.end(readFileSync(f));
  }).listen(1437, "127.0.0.1");
  base = "http://127.0.0.1:1437/wispify-web/";
}
const PAGES = [
  ["home", ""], ["features", "features/"], ["voice", "voice/"], ["stage", "stage/"], ["download", "download/"],
  ["changelog", "changelog/"], ["faq", "faq/"], ["about", "about/"], ["404", "nope/"],
].filter(([n]) => !only.length || only.includes(n));
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const errors = [];
for (const [vp, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
  const ctx = await browser.newContext(opts);
  for (const [name, path] of PAGES) {
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${vp}/${name}: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${vp}/${name} console: ${m.text()}`); });
    page.on("requestfailed", (r) => errors.push(`${vp}/${name} failed: ${r.url()}`));
    page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("/nope/")) errors.push(`${vp}/${name} ${r.status()}: ${r.url()}`); });
    await page.goto(base + path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/${vp}-${name}-1-top.png` });
    if (name === "home" || name === "stage") {
      const btn = await page.$(name === "home" ? "#p-play" : "#stage-play");
      if (btn) { await btn.click(); await page.waitForTimeout(2600); await page.screenshot({ path: `${OUT}/${vp}-${name}-2-playing.png` }); await btn.click(); }
    }
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 500) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(70); }
    await page.waitForTimeout(900);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${vp}-${name}-full.png`, fullPage: true });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
server?.close();
console.log(errors.length ? errors.join("\n") : "no errors");
