// Extract frames at key DEMO_SCRIPT beat timestamps from the published MP4
// for visual audit. Also extract a single audio waveform PNG so we can spot
// the PEAK 1 silence + tail fade-out without listening.

import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import ffprobe from "@ffprobe-installer/ffprobe";
import ffmpegInst from "@ffmpeg-installer/ffmpeg";

const ffmpegPath = ffmpegInst.path;
const MP4 = "c:/benj/claude-hackathon-apr-2026/tmp/video-audit/lacunex-demo.mp4";
const OUT = "c:/benj/claude-hackathon-apr-2026/tmp/video-audit/frames";
fs.mkdirSync(OUT, { recursive: true });

// Probe duration + audio specs
const probe = execFileSync(
  ffprobe.path,
  [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,bit_rate",
    "-of", "default=nokey=0:noprint_wrappers=1",
    MP4,
  ],
  { encoding: "utf8" }
);
console.log("=== ffprobe ===");
console.log(probe);

// Beat timestamps from DEMO_SCRIPT.md
const beats = [
  ["00-cold-open-1-cloudflare", 3],
  ["01-cold-open-2-covid", 8],
  ["02-cold-open-3-hackney", 13],
  ["03-pivot-fade-to-black", 17],
  ["04-template-pick", 26],
  ["05-conductor-extraction", 43],
  ["06-PEAK1-meta-notice", 60],
  ["07-PEAK1-silent-hold", 65],
  ["08-PEAK1-VO-resumes", 70],
  ["09-PEAK2-Stockholm-overlay", 80],
  ["10-PEAK2-participant-hold", 88],
  ["11-PEAK3-letter-headline", 100],
  ["12-PEAK3-what-surfaced", 110],
  ["13-convergence-map-settled", 120],
  ["14-convergence-hover", 130],
  ["15-brief-designer-card", 138],
  ["16-held-takeaway-sentence", 146],
  ["17-url-attribution-card", 149],
];

for (const [name, t] of beats) {
  const out = path.join(OUT, `${name}.png`);
  try {
    execFileSync(ffmpegPath, [
      "-y", "-ss", String(t),
      "-i", MP4, "-frames:v", "1", "-q:v", "2", out,
    ], { stdio: "pipe" });
    console.log(`extracted t=${t}s → ${path.basename(out)}`);
  } catch (err) {
    console.error(`FAILED at t=${t}s: ${err.message.split('\n')[0]}`);
  }
}

// Audio waveform PNG (full track)
try {
  const wf = path.join(OUT, "_audio-waveform.png");
  execFileSync(ffmpegPath, [
    "-y", "-i", MP4,
    "-filter_complex", "showwavespic=s=1920x240:colors=#444",
    "-frames:v", "1", wf,
  ], { stdio: "pipe" });
  console.log(`audio waveform → ${path.basename(wf)}`);
} catch (err) {
  console.error(`waveform FAILED: ${err.message.split('\n')[0]}`);
}
