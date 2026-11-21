import { defineConfig } from "vite";
// Relative base so the build works at https://<user>.github.io/wispify-web/ and anywhere else.
export default defineConfig({
  base: "./",
  build: { target: "es2020", cssMinify: true, assetsInlineLimit: 0 },
});
