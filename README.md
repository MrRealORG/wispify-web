# wispify-web

The website for [Wispify](https://github.com/MrRealORG/Wispify), a tiny native music player for Windows with offline voice control and a live Stage visualizer.

Live: https://mrrealorg.github.io/wispify-web/

## What's here

A Vite multi-page site, plain HTML/CSS/JS, no framework.

## Design

The site uses the app's own design system (`src/styles/theme-v2.css` + `theme-v21.css` in the app repo): a solid `#0b0b12` window on a slightly deeper `#08080c` desk, white text stacked by opacity (.95 / .64 / .42), hairline `rgba(255,255,255,.075)` borders, 10 / 14 / 22 px radii (26 px for windows), Segoe UI Variable, Lucide icons, the app's keycaps, switches, segmented controls, context menu, toast and UI sounds, and one accent: the app's default violet `#a78bfa` with ink `#120c24`, used only for the primary action and live feedback. No gradients, no glows. Tokens live at the top of `src/css/base.css`.

| Route | File | What it is |
| --- | --- | --- |
| `/` | `index.html` | The real widget rebuilt in HTML (plays the generated demo loop), what's inside, voice teaser, Stage film |
| `/features/` | `features/index.html` | Annotated real screenshots, interactive hotkeys |
| `/voice/` | `voice/index.html` | Hold-F8 playground running the real grammar, every command |
| `/stage/` | `stage/index.html` | All 8 Stage templates drawn live next to a copy of the app's Stage sheet, real captures |
| `/download/` | `download/index.html` | OS detection, installer / portable, requirements, release notes |
| `/changelog/` | `changelog/index.html` | Generated from the app's CHANGELOG (`scripts/changelog.py`) |
| `/faq/` | `faq/index.html` | Docs & FAQ |
| `/about/` | `about/index.html` | Maker, credits, licences |
| 404 | `404.html` | GitHub Pages not-found page |

Shared header/footer/head live in `partials/` and are stamped into each page at build time by a tiny plugin in `vite.config.js`.

- `src/js/grammar.js` is a line-for-line port of `src-tauri/src/commands.rs` (v2.1.4) and passes the Rust unit-test cases.
- `src/js/viz.js` ports the app's Stage renderer (`src/stage/viz/*`, `stageTemplates.ts`).
- `src/js/audio.js` synthesises an original demo loop with WebAudio; nothing plays until the visitor presses Play.
- Type is the system's Segoe UI Variable (like the app) / SF on macOS. A subset Open Sans woff2 is the fallback only where neither exists; JetBrains Mono backs up Cascadia Mono for code (SIL OFL 1.1, licences in `public/fonts/`).

## Develop

```bash
npm ci
npm run dev
npm run build      # → dist/
```

Screenshots: `CHROME=/path/to/chrome node scripts/shots.mjs <outDir>`. OG cards: `node scripts/og.mjs`.

Deploys to GitHub Pages on every push to `main` (`.github/workflows/deploy.yml`).

## License

MIT © 2026 Ahmad Raza (MrReal)
