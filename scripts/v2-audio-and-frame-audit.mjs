// Per-second audio loudness sweep on v2 MP4 + 30 frame extractions aligned
// to script beats. Output:
//   tmp/video-audit/v2-audio-rms.csv  (time,rms_dbfs)
//   tmp/video-audit/v2-frames/        (30 frames at script-meaningful timestamps)
//   tmp/video-audit/v2-waveform.png   (high-contrast waveform of full track)

import { execFileSync, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import ffmpegInst from "@ffmpeg-installer/ffmpeg";

const ff = ffmpegInst.path;
const MP4 = "tmp/video-audit/lacunex-demo-v2.mp4";
const FRAMES = "tmp/video-audit/v2-frames";
fs.mkdirSync(FRAMES, { recursive: true });

// 1) Audio: split into 1s windows, dump RMS per window
const ASTATS = spawnSync(ff, [
  "-i", MP4,
  "-af", "astats=metadata=1:reset=1:length=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-",
  "-f", "null", "-",
], { encoding: "utf8" });
const stderr = ASTATS.stderr;
// Parse lines like:  frame:N pts:NN.NNN pts_time:NN.NNN  + lavfi.astats.Overall.RMS_level=-XX.XX
const rows = [];
const blocks = stderr.split(/^frame:/m);
for (const b of blocks) {
  const t = /pts_time:([0-9.]+)/.exec(b)?.[1];
  const r = /Overall\.RMS_level=(-?[0-9.]+)/.exec(b)?.[1];
  if (t && r) rows.push([Number(t).toFixed(2), Number(r).toFixed(1)]);
}
fs.writeFileSync("tmp/video-audit/v2-audio-rms.csv",
  "time,rms_dbfs\n" + rows.map(([t, r]) => `${t},${r}`).join("\n") + "\n");
console.log(`audio: ${rows.length} windows captured`);

// 2) Audio waveform PNG with explicit scale + colors (so we don't get a
// flat-looking auto-normalized image)
execFileSync(ff, [
  "-y", "-i", MP4,
  "-filter_complex", "showwavespic=s=1920x300:colors=#1a1a1a|#666:scale=lin",
  "-frames:v", "1",
  "tmp/video-audit/v2-waveform.png",
], { stdio: "pipe" });
console.log("waveform saved");

// 3) Beat-aligned frames. Times tuned to v2 timeline (2:18.6, post cold-open compression)
const beats = [
  ["00-coldopen-cards-stacking", 1],
  ["01-coldopen-card2-lands", 5.5],
  ["02-coldopen-card3-lands", 10.5],
  ["03-coldopen-stack-held", 14],
  ["04-pivot-VO-over-stack", 16],
  ["05-template-pick", 20],
  ["06-template-pick-late", 25],
  ["07-conductor-extraction-start", 27],
  ["08-conductor-extraction-mid", 33],
  ["09-PEAK1-meta-notice", 38],
  ["10-PEAK1-silent-hold", 41],
  ["11-PEAK1-VO-resumes", 47],
  ["12-PEAK1-tail", 60],
  ["13-PEAK2-Stockholm-overlay", 70],
  ["14-PEAK2-anchor-return-bg", 76],
  ["15-PEAK2-participant-line", 80],
  ["16-PEAK3-letter-headline", 88],
  ["17-PEAK3-what-surfaced", 94],
  ["18-convergence-map-start", 100],
  ["19-convergence-map-mid", 110],
  ["20-convergence-chyron-visible", 113],
  ["21-brief-designer", 119],
  ["22-brief-designer-end", 124],
  ["23-held-takeaway-card", 128],
  ["24-held-takeaway-mid", 131],
  ["25-URL-card-bleed-in", 134],
  ["26-URL-card-readable", 136],
  ["27-URL-card-tail", 138],
];
for (const [name, t] of beats) {
  const out = path.join(FRAMES, `${name}.png`);
  try {
    execFileSync(ff, ["-y", "-ss", String(t), "-i", MP4, "-frames:v", "1", "-q:v", "2", out], { stdio: "pipe" });
    console.log(`extracted t=${t}s -> ${name}`);
  } catch (e) {
    console.error(`FAILED t=${t}: ${e.message.split('\n')[0]}`);
  }
}
