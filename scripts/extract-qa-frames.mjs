import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import ffprobe from '@ffprobe-installer/ffprobe';

// Use ffprobe binary as ffmpeg (single binary that bundles both)
import ffmpegInstaller from '@ffprobe-installer/ffprobe';

// Try @ffmpeg-installer/ffmpeg if available
let ffmpegPath;
try {
  const m = await import('@ffmpeg-installer/ffmpeg');
  ffmpegPath = m.default?.path || m.path;
} catch {
  // Fallback: ffprobe-only — we'll skip frame extraction and report
  ffmpegPath = null;
}

const dir = 'c:/benj/claude-hackathon-apr-2026/transcripts/captures';
const outDir = 'c:/benj/claude-hackathon-apr-2026/tmp/frame-samples-v2';
fs.mkdirSync(outDir, { recursive: true });

if (!ffmpegPath) {
  console.log('ffmpeg not available — install @ffmpeg-installer/ffmpeg first');
  process.exit(1);
}

const webms = [];
for (const sub of fs.readdirSync(dir)) {
  const full = path.join(dir, sub);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) if (f.endsWith('.webm')) webms.push(path.join(full, f));
}

for (const webm of webms) {
  // Get duration
  const out = execFileSync(ffprobe.path, [
    '-v', 'error', '-count_packets', '-select_streams', 'v:0',
    '-show_entries', 'stream=r_frame_rate,nb_read_packets',
    '-of', 'default=nokey=0:noprint_wrappers=1', webm,
  ], { encoding: 'utf8' });
  const lines = out.trim().split(/\r?\n/);
  const obj = Object.fromEntries(lines.map(l => l.split('=')));
  const fr = obj.r_frame_rate?.split('/');
  const fps = fr && fr.length === 2 ? Number(fr[0]) / Number(fr[1]) : 30;
  const frames = Number(obj.nb_read_packets);
  const dur = frames / fps;
  const capture = path.basename(path.dirname(webm)).replace('capture-', '');

  // Extract end frame (where final state is held)
  const endFrame = path.join(outDir, `${capture}-end.png`);
  execFileSync(ffmpegPath, [
    '-y', '-ss', String(Math.max(0, dur - 0.5).toFixed(2)),
    '-i', webm, '-frames:v', '1', '-q:v', '2', endFrame,
  ], { stdio: 'pipe' });
  // Mid frame
  const midFrame = path.join(outDir, `${capture}-mid.png`);
  execFileSync(ffmpegPath, [
    '-y', '-ss', String((dur / 2).toFixed(2)),
    '-i', webm, '-frames:v', '1', '-q:v', '2', midFrame,
  ], { stdio: 'pipe' });
  console.log(`${capture}: dur=${dur.toFixed(1)}s, frames at ${path.relative(process.cwd(), midFrame)} and ${path.relative(process.cwd(), endFrame)}`);
}
