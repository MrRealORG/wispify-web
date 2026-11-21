# wispify-web

The website for [Wispify](https://github.com/MrRealORG/Wispify), a tiny native music player for Windows with offline voice control and a live Stage visualizer.

Live: https://mrrealorg.github.io/wispify-web/

## What's here

A Vite multi-page site, plain HTML/CSS/JS, no framework.

| Route | File | What it is |
| --- | --- | --- |
| `/` | `index.html` | Live stage hero (audio-reactive canvas + generated demo loop), tracklist, voice teaser, Stage film |
| `/features/` | `features/index.html` | Annotated real screenshots, interactive hotkeys |
| `/voice/` | `voice/index.html` | Hold-F8 playground running the real grammar, every command |
| `/stage/` | `stage/index.html` | All 8 Stage templates drawn live, real captures |
| `/download/` | `download/index.html` | OS detection, installer / portable, requirements, release notes |
| `/changelog/` | `changelog/index.html` | Generated from the app's CHANGELOG (`scripts/changelog.py`) |
| `/faq/` | `faq/index.html` | Docs & FAQ |
| `/about/` | `about/index.html` | Maker, credits, licences |
| 404 | `404.html` | GitHub Pages not-found page |

Shared header/footer/head live in `partials/` and are stamped into each page at build time by a tiny plugin in `vite.config.js`.

- `src/js/grammar.js` is a line-for-line port of `src-tauri/src/commands.rs` (v2.1.4) and passes the Rust unit-test cases.
- `src/js/viz.js` ports the app's Stage renderer (`src/stage/viz/*`, `stageTemplates.ts`).
- `src/js/audio.js` synthesises an original demo loop with WebAudio; nothing plays until the visitor presses Play.
- Fonts are self-hosted, subset woff2: Bricolage Grotesque, Instrument Serif, JetBrains Mono (SIL OFL 1.1, licences in `public/fonts/`).

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
