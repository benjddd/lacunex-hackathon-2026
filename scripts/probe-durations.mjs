import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import ffprobe from '@ffprobe-installer/ffprobe';

const dir = 'c:/benj/claude-hackathon-apr-2026/transcripts/captures';
const webms = [];
for (const sub of fs.readdirSync(dir)) {
  const full = path.join(dir, sub);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) if (f.endsWith('.webm')) webms.push(path.join(full, f));
}

for (const webm of webms) {
  let dur;
  try {
    // -count_packets gives an exact answer when format=duration is missing.
    const out = execFileSync(
      ffprobe.path,
      [
        '-v', 'error',
        '-count_packets',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=duration_ts,r_frame_rate,nb_read_packets',
        '-of', 'default=nokey=0:noprint_wrappers=1',
        webm,
      ],
      { encoding: 'utf8' }
    );
    const lines = out.trim().split(/\r?\n/);
    const obj = Object.fromEntries(lines.map(l => l.split('=')));
    const fr = obj.r_frame_rate?.split('/');
    const fps = fr && fr.length === 2 ? Number(fr[0]) / Number(fr[1]) : NaN;
    const frames = Number(obj.nb_read_packets);
    if (Number.isFinite(fps) && Number.isFinite(frames) && fps > 0) {
      dur = frames / fps;
    }
  } catch (err) {
    dur = `err: ${err.message.split('\n')[0]}`;
  }
  const rel = path.relative(dir, webm).split(path.sep).join('/');
  console.log(`${rel}\t${typeof dur === 'number' ? dur.toFixed(2) + 's' : dur}`);
}
