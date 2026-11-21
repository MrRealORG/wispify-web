# wispify-web

Marketing and download site for [Wispify](https://github.com/MrRealORG/Wispify), a tiny native music player for Windows with offline voice control and a live Stage visualizer.

Live: https://mrrealorg.github.io/wispify-web/

## Stack

- Vite, plain HTML/CSS/JS. No UI framework, no web fonts, one dev dependency.
- Animations use `transform` and `opacity` only; everything respects `prefers-reduced-motion`.
- Images are WebP with `srcset` and lazy loading.

## Develop

```bash
npm ci
npm run dev      # http://localhost:5173
npm run build    # → dist/
```

Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`.

## Screenshots

All screenshots are of the real Wispify 2.1 UI (branch `v2-overhaul`) rendered in Chromium, with demo songs: original track names, generated abstract covers and placeholder lyrics, so no third-party artwork or lyrics appear on the site.

## License

Site code: MIT © 2026 Ahmad Raza (MrReal). The Wispify name and icon belong to the Wispify project.
