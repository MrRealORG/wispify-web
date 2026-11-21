import { defineConfig } from "vite";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Served from https://mrrealorg.github.io/wispify-web/ (GitHub Pages project site).
const BASE = "/wispify-web/";
const SITE = "https://mrrealorg.github.io/wispify-web/";
const root = (p) => resolve(__dirname, p);
const part = (name) => readFileSync(root(`partials/${name}.html`), "utf8");

const PAGES = {
  main: "index.html",
  features: "features/index.html",
  voice: "voice/index.html",
  stage: "stage/index.html",
  download: "download/index.html",
  changelog: "changelog/index.html",
  faq: "faq/index.html",
  about: "about/index.html",
  notfound: "404.html",
};

const NAV = [
  ["features", "Features"],
  ["voice", "Voice"],
  ["stage", "Stage"],
  ["changelog", "Changelog"],
  ["faq", "Docs"],
  ["about", "About"],
];

/** Tiny build-time include: every page starts with
 *  <!--@page {"title":"…","desc":"…","path":"voice/","nav":"voice","og":"voice"}-->
 *  and gets the shared <head> meta, header and footer stamped in. No runtime JS. */
function partials() {
  return {
    name: "wispify-partials",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const m = html.match(/<!--@page (\{.*?\})-->/s);
        if (!m) return html;
        const page = JSON.parse(m[1]);
        const nav = NAV.map(([id, label], i) => {
          const cur = page.nav === id ? ' aria-current="page"' : "";
          return `<li><a href="${BASE}${id}/"${cur}><span class="nav__n">0${i + 1}</span>${label}</a></li>`;
        }).join("");
        const fill = (s) =>
          s
            .replaceAll("{{title}}", page.title)
            .replaceAll("{{desc}}", page.desc)
            .replaceAll("{{url}}", SITE + (page.path || ""))
            .replaceAll("{{og}}", `${SITE}og/${page.og || "home"}.png`)
            .replaceAll("{{nav}}", nav)
            .replaceAll("{{dlcur}}", page.nav === "download" ? ' aria-current="page"' : "");
        return html
          .replace(m[0], fill(part("head")))
          .replace("<!--@header-->", fill(part("header")))
          .replace("<!--@footer-->", fill(part("footer")))
          .replaceAll("%B%", BASE);
      },
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [partials()],
  build: {
    target: "es2020",
    cssMinify: true,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    rollupOptions: { input: Object.fromEntries(Object.entries(PAGES).filter(([, v]) => existsSync(root(v))).map(([k, v]) => [k, root(v)])) },
  },
});
