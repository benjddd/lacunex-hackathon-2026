// Download the MP4 backing a Descript share URL.
import { chromium } from "playwright";
import * as fs from "node:fs";

const SHARE_URL = process.argv[2] ?? "https://share.descript.com/view/E57gyPt1HM9";
const OUT_PATH = process.argv[3] ?? "tmp/video-audit/lacunex-demo-v2.mp4";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();

// Capture all network responses; we want the .mp4 (or signed CDN URL).
const candidates = [];
page.on("response", (res) => {
  const url = res.url();
  if (/\.mp4(\?|$)|\bmedia-export\b|\bvideo\/mp4\b/i.test(url) ||
      res.headers()["content-type"]?.startsWith("video/")) {
    candidates.push({ url, ct: res.headers()["content-type"], len: res.headers()["content-length"] });
  }
});

await page.goto(SHARE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
// Try to start playback so the player resolves the source URL
await page.waitForTimeout(2_000);
await page.evaluate(() => {
  for (const v of Array.from(document.querySelectorAll("video"))) v.play().catch(() => {});
}).catch(() => {});
await page.waitForTimeout(5_000);

// Also probe directly for video.src
const videoSrcs = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("video")).map((v) => v.currentSrc || v.src).filter((s) => s);
});
console.log("video element srcs:", JSON.stringify(videoSrcs, null, 2));
console.log("network candidates:", JSON.stringify(candidates.slice(0, 5), null, 2));

const directUrl = videoSrcs.find((u) => /^https?:/.test(u)) ||
                  candidates.map((c) => c.url).find((u) => /\.mp4/.test(u));

if (directUrl) {
  console.log("downloading:", directUrl);
  const res = await ctx.request.get(directUrl);
  fs.writeFileSync(OUT_PATH, await res.body());
  console.log(`saved ${OUT_PATH} (${fs.statSync(OUT_PATH).size} bytes)`);
} else {
  console.log("no direct .mp4 url found; share viewer may use HLS/DASH");
}

await browser.close();
