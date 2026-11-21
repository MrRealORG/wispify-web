import "../css/pages.css";
import "../css/download.css";
import { copyText } from "./common.js";

const ua = navigator.userAgent;
const plat = (navigator.userAgentData?.platform || navigator.platform || "").toLowerCase();
const os = /win/.test(plat) || /Windows NT/.test(ua) ? "Windows"
  : /android/i.test(ua) ? "Android"
  : /iphone|ipad|ipod/i.test(ua) || (/mac/.test(plat) && navigator.maxTouchPoints > 1) ? "iOS"
  : /mac/.test(plat) ? "macOS"
  : /linux|cros/.test(plat) ? (/CrOS/.test(ua) ? "ChromeOS" : "Linux") : null;

const osEl = document.getElementById("os");
const away = document.getElementById("away");
if (os === "Windows") {
  osEl.innerHTML = `<span class="live-dot"></span> You're on Windows. The installer is the one to get.`;
  document.body.classList.add("on-win");
} else if (os) {
  osEl.innerHTML = `<span class="live-dot"></span> You're on ${os}. Wispify runs on Windows 10 and 11 only, for now.`;
  away.hidden = false;
}
const copy = document.getElementById("copy");
copy?.addEventListener("click", async () => {
  await copyText(location.href);
  copy.textContent = "Link copied";
  setTimeout(() => (copy.textContent = "Copy download link"), 2200);
});
