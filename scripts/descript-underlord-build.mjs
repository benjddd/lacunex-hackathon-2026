// Parallel Underlord build attempt for the Lacunex v2 demo.
//
// 1. Creates a new Descript project (so we don't touch the user's main one).
// 2. Uploads all v2 media files.
// 3. Probes /v1/jobs/agent schema then fires a detailed prompt for a full assembly.
// 4. Polls the agent job and tries to publish.
//
// Run: node --env-file=.env.local scripts/descript-underlord-build.mjs

import * as fs from "node:fs";
import * as path from "node:path";

const TOKEN = process.env.DESCRIPT_API_TOKEN;
if (!TOKEN) {
  console.error("DESCRIPT_API_TOKEN missing");
  process.exit(1);
}

const BASE = "https://descriptapi.com/v1";
const SRC_DIR = "transcripts/captures/_descript";
const PROJECT_NAME = "Lacunex v2 — Underlord attempt";

// v2 asset list per task instructions
const FILES = [
  "s1-question.png",          // task asked for s1-question-v2.png; only v1 exists, falling back
  "s2-personal.png",
  "s8-architecture.png",
  "s10-close.png",
  "beat1-map-21s.mp4",
  "beat4-left-pane-only.mp4",
  "beat4-full-split.mp4",
  "beat5-speed-ramped.mp4",
  "beat7-letter-22s.mp4",
  "beat9-brief-designer-8s.mp4",
  "03-borealis.mp3",
];

const CONTENT_TYPES = {
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, body, accept = "application/json") {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: accept,
    },
  };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
  return { status: res.status, ok: res.ok, text, json };
}

async function getJob(jobId) {
  const r = await api("GET", `/jobs/${jobId}`);
  return r.json ?? { job_state: "unknown" };
}

async function waitForJob(jobId, label = "", maxMs = 6 * 60 * 1000) {
  const deadline = Date.now() + maxMs;
  let last = "";
  while (Date.now() < deadline) {
    const j = await getJob(jobId);
    if (j.job_state !== last) {
      console.log(`    ${label} job_state=${j.job_state}`);
      last = j.job_state;
    }
    if (j.job_state === "stopped" || j.job_state === "failed" || j.job_state === "succeeded") return j;
    await sleep(4000);
  }
  return { job_state: "timeout" };
}

async function createProjectViaImport() {
  // POST /v1/jobs/import/project_media without project_id should create a new project.
  // Try with just project_name first.
  const body = { project_name: PROJECT_NAME };
  const r = await api("POST", "/jobs/import/project_media", body);
  console.log(`createProject status=${r.status}`);
  if (r.status !== 201 && r.status !== 200) {
    console.log(`  body=${r.text.slice(0, 500)}`);
  }
  return r;
}

async function importJob(projectId, name, contentType, fileSize) {
  const body = {
    project_id: projectId,
    add_media: { [name]: { content_type: contentType, file_size: fileSize } },
  };
  const r = await api("POST", "/jobs/import/project_media", body);
  if (r.status !== 201 && r.status !== 200) throw new Error(`import job ${r.status}: ${r.text.slice(0, 300)}`);
  const u = r.json?.upload_urls?.[name];
  if (!u?.upload_url) throw new Error(`no upload_url: ${r.text.slice(0, 300)}`);
  return { jobId: r.json.job_id, uploadUrl: u.upload_url };
}

async function putFile(uploadUrl, filePath) {
  const buf = fs.readFileSync(filePath);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: buf,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`PUT ${res.status}: ${t.slice(0, 300)}`);
  }
}

async function uploadOne(projectId, name) {
  const filePath = path.join(SRC_DIR, name);
  if (!fs.existsSync(filePath)) {
    console.log(`[${name}] MISSING — skip`);
    return { name, ok: false, error: "missing" };
  }
  const stat = fs.statSync(filePath);
  const ext = path.extname(name).toLowerCase();
  const ct = CONTENT_TYPES[ext] ?? "application/octet-stream";
  console.log(`[${name}] ${(stat.size / 1024 / 1024).toFixed(2)} MB ${ct}`);
  let importRes;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      importRes = await importJob(projectId, name, ct, stat.size);
      break;
    } catch (e) {
      if (e.message.includes("429")) {
        console.log(`    queued (attempt ${attempt}); waiting 6s...`);
        await sleep(6000);
        continue;
      }
      throw e;
    }
  }
  if (!importRes) throw new Error("import job stuck");
  const { jobId, uploadUrl } = importRes;
  console.log(`  job: ${jobId}`);
  await putFile(uploadUrl, filePath);
  console.log(`  PUT ok`);
  await waitForJob(jobId, name, 4 * 60 * 1000);
  return { name, jobId, ok: true };
}

const UNDERLORD_PROMPT = `Assemble a polished 2:40 demo video at 1920x1080 from the uploaded media.
Aspect: 16:9. Target runtime: 2:40 (2 minutes 40 seconds). Title: "Lacunex v2 — Underlord attempt".

Music bed: use 03-borealis.mp3 underneath the entire video at -22 dB. Duck to -34 dB whenever there is voiceover (any silent VO track that may be added later — leave the duck rule in place even if the VO track is empty). Fade music in over 1.5s at 0:00, fade music out over 2s at 2:38.

CRITICAL: at 1:20.4 to 1:26.0 (a 5.6-second window inside Beat 6) drop the music to silence. 200ms fade out before, 200ms fade in after. This is the silence drop and is non-negotiable.

Build the timeline as 10 sequential beats. Each beat needs the listed visual on the video track and a TEXT SCENE / TITLE OVERLAY where indicated. Ben will record voiceover separately, so leave a clean VO bus and do NOT generate Overdub audio. If you support placeholder VO captions, use the verbatim VO text from each beat as a low-third caption that I can later replace.

BEAT 1 — Cohort opener (0:00–0:25, 25 seconds)
Visual: at 0:00–0:04 a black background with this italic-serif headline centered:
  "What does the platform find when nobody tells it what to look for?"
Then at 0:04 fade up beat1-map-21s.mp4 — let it play through 0:25.
VO text (display as captions, do not synthesize):
  "Eleven residents. One brief. The brief asked about five things. The cohort surfaced twelve. Self-censorship around being read as anti-progress. Hidden dependents in personal logistics. Adaptations to a policy that isn't even live yet. Patterns you only see when the cohort is viewed together."

BEAT 2 — Personal frame (0:25–0:38, 13 seconds)
Visual: s2-personal.png as the background. Add italic-serif text centered on top:
  "Lacunex — adaptive interviews, at scale."
VO text:
  "I'm a systems analyst. Ten years on systems analysis. Work that only lands when you know what real people actually think. Two gaps never close: beginners don't yet know how to run a good interview round; professionals who do never have enough time."

BEAT 3 — The gap (0:38–0:53, 15 seconds)
Visual: continue s2-personal.png, fading darker over the beat (opacity 0.3 to 0.05).
VO text:
  "Big organisations could ask but rarely do — answers come too late to act on. Smaller ones rarely ask enough. Residents weighing a policy, patients before treatment, witnesses after a near-miss — only real people can answer. I built this to close both gaps."

BEAT 4 — Sliding split-screen reveal (0:53–1:03, 10 seconds)
Visual: play beat4-left-pane-only.mp4 (4 seconds) from 0:53–0:57, then cross-cut to beat4-full-split.mp4 from 0:57–1:03. If you can keyframe a zoom-out, use beat4-full-split.mp4 the whole way and zoom from focused-left to full split.
VO text: "You're now watching one of those eleven — a civic consultation about a proposed congestion charge. Same platform, one live session."

BEAT 5 — Sped-up chat (1:03–1:18, 15 seconds)
Visual: beat5-speed-ramped.mp4 (already speed-ramped). Play it from 1:03 onward. Show a small "x5" label top-right (JetBrains Mono 11pt #888) from 1:03 to 1:13.
VO text: "Six turns in fifteen seconds. Watch the dashboard, not the chat — extraction is happening live, turn by turn."

BEAT 6 — Cross-turn diamond + silence drop (1:18–1:38, 20 seconds)
Visual: continue beat5-speed-ramped.mp4 (it includes the freeze on the meta-notice panel) OR loop the last frame from 1:18 to 1:38.
VO text part 1 (1:15–1:17): "How long would a careful reader take to notice that what the participant just called 'small adjustments' includes moving a medical appointment?"
SILENCE DROP: music to silence 1:20.4–1:26.0 (5.6s). Restore at -24 dB after.
VO text part 2 (1:23.6–): "That's the cross-turn move. The platform caught it in real time."

BEAT 7 — Letter takeaway (1:38–2:00, 22 seconds)
Visual: beat7-letter-22s.mp4
VO text: "At session close, the participant opens a reflection she didn't write. The host gets structured insight; the participant gets herself, read back. Both sides leave with something."
Cross-fade to black at 1:57–1:58. Hold black 1:58–2:00.

BEAT 8 — Architecture (2:00–2:20, 20 seconds)
Visual: s8-architecture.png. Hold for 20 seconds.
VO text: "Three workers run under one Conductor. Meta-noticing and extraction in parallel, every turn. Routing across five typed moves. Three of the five workflow patterns from Anthropic's own paper, running together."

BEAT 9 — Meta-brief / recursive dog-food (2:20–2:28, 8 seconds)
Visual: beat9-brief-designer-8s.mp4. Slight zoom-in 1.0 to 1.04 over the 8s.
Lower-third italic-serif text: "the platform interviews the host who designs the next interview"
VO text: "And the brief itself? The platform writes it — by interviewing the host. Same four calls. All the way down."
Cross-fade to black 2:27.5–2:28.

BEAT 10 — Close card (2:28–2:40, 12 seconds)
Visual: s10-close.png held for 12 seconds.
VO text (optional, brief): "Lacunex. Built in five days."
Music fades out 2:38–2:40, ending in silence. One frame of black at 2:40.

Aspect: 1920x1080. Frame rate: 30 fps. Color: keep source colors faithful, no aggressive grading.

Goal: produce a complete cut a human editor can review in Descript and tweak. Do not generate any voiceover audio — leave the VO track empty for human dubbing.`;

async function probeAgentSchema(projectId) {
  // Try a small set of plausible shapes and return the first that doesn't 400.
  const candidates = [
    { project_id: projectId, prompt: "hello world" },
    { project_id: projectId, message: "hello world" },
    { project_id: projectId, instructions: "hello world" },
    { project_id: projectId, input: "hello world" },
    { project_id: projectId, content: "hello world" },
    { project_id: projectId, agent_prompt: "hello world" },
  ];
  for (const body of candidates) {
    const r = await api("POST", "/jobs/agent", body);
    console.log(`agent probe ${Object.keys(body).filter(k=>k!=='project_id').join(',')} -> ${r.status} ${r.text.slice(0, 200)}`);
    if (r.status === 201 || r.status === 200 || r.status === 202) {
      return { schema: body, response: r };
    }
    // 400 with hint about field names is gold
    if (r.status === 400 && r.text) {
      // continue but log
    }
    await sleep(800);
  }
  return null;
}

async function fireUnderlord(projectId, schemaTemplate, prompt) {
  const body = { ...schemaTemplate, project_id: projectId };
  // replace the small probe value with the real prompt
  for (const k of Object.keys(body)) {
    if (k !== "project_id" && body[k] === "hello world") body[k] = prompt;
  }
  const r = await api("POST", "/jobs/agent", body);
  console.log(`underlord fire status=${r.status}`);
  if (!r.ok) console.log(`  body=${r.text.slice(0, 600)}`);
  return r;
}

async function publishProject(projectId, compositionId) {
  const body = compositionId ? { project_id: projectId, composition_id: compositionId } : { project_id: projectId };
  const r = await api("POST", "/jobs/publish", body);
  console.log(`publish status=${r.status}`);
  if (!r.ok) console.log(`  body=${r.text.slice(0, 400)}`);
  return r;
}

async function getProject(projectId) {
  const r = await api("GET", `/projects/${projectId}`);
  return r;
}

async function main() {
  console.log(`token: ${TOKEN.slice(0, 8)}...`);
  console.log(`creating new project: ${PROJECT_NAME}\n`);

  const created = await createProjectViaImport();
  if (created.status !== 201 && created.status !== 200) {
    console.error(`CREATE FAILED: ${created.text.slice(0, 600)}`);
    // fall back to alternative: try /projects POST
    const alt = await api("POST", "/projects", { name: PROJECT_NAME });
    console.log(`alt POST /projects status=${alt.status} body=${alt.text.slice(0, 400)}`);
    if (!alt.ok) {
      console.error("Cannot create project; aborting.");
      process.exit(1);
    }
    var projectId = alt.json?.project_id ?? alt.json?.id;
  } else {
    var projectId = created.json?.project_id ?? created.json?.id;
    if (!projectId && created.json) {
      // try from job
      const jobId = created.json.job_id;
      if (jobId) {
        const j = await waitForJob(jobId, "create-project", 60_000);
        projectId = j?.result?.project_id ?? j?.project_id;
      }
    }
  }
  if (!projectId) {
    console.error(`No project_id obtained. created.json=${JSON.stringify(created.json).slice(0, 600)}`);
    process.exit(1);
  }
  console.log(`PROJECT_ID=${projectId}\n`);

  // Upload all files sequentially (jobs serialize per project)
  const results = [];
  for (const name of FILES) {
    try {
      results.push(await uploadOne(projectId, name));
    } catch (err) {
      console.error(`  FAIL ${name}: ${err.message}`);
      results.push({ name, ok: false, error: err.message });
    }
    await sleep(2000);
  }

  console.log(`\nWaiting 8s for server-side imports to settle...`);
  await sleep(8000);

  // Probe agent schema
  console.log(`\nProbing /jobs/agent schema...`);
  const probe = await probeAgentSchema(projectId);
  if (!probe) {
    console.log(`Could not find a working /jobs/agent schema with simple probes.`);
    // continue anyway and try with prompt directly
  }

  // Fire underlord
  console.log(`\nFiring Underlord prompt...`);
  const schemaTemplate = probe?.schema ?? { project_id: projectId, prompt: "" };
  const fired = await fireUnderlord(projectId, schemaTemplate, UNDERLORD_PROMPT);

  let agentJobId = fired.json?.job_id;
  let agentResult = null;
  if (agentJobId) {
    console.log(`agent job id: ${agentJobId} — polling (up to 12 min)`);
    agentResult = await waitForJob(agentJobId, "underlord", 12 * 60 * 1000);
    console.log(`agent final state: ${agentResult.job_state}`);
    console.log(`agent result: ${JSON.stringify(agentResult).slice(0, 800)}`);
  }

  // Try to get project state (compositions)
  const proj = await getProject(projectId);
  const compositions = proj.json?.compositions ?? [];
  console.log(`\nproject compositions: ${compositions.length}`);

  // Publish
  let publishUrl = null;
  if (agentResult?.job_state === "stopped" || agentResult?.job_state === "succeeded") {
    const compId = compositions[0]?.id ?? compositions[0]?.composition_id;
    const pub = await publishProject(projectId, compId);
    if (pub.json?.job_id) {
      const pj = await waitForJob(pub.json.job_id, "publish", 4 * 60 * 1000);
      publishUrl = pj?.result?.share_url ?? pj?.result?.url ?? null;
    }
  }

  console.log(`\n=== FINAL ===`);
  console.log(`PROJECT_ID: ${projectId}`);
  console.log(`web URL guess: https://web.descript.com/${projectId}`);
  console.log(`uploads ok: ${results.filter(r=>r.ok).length}/${results.length}`);
  console.log(`uploads failed: ${results.filter(r=>!r.ok).map(r=>r.name).join(', ') || 'none'}`);
  console.log(`agent job: ${agentJobId ?? 'NEVER FIRED'}`);
  console.log(`agent state: ${agentResult?.job_state ?? 'n/a'}`);
  console.log(`publish url: ${publishUrl ?? 'n/a'}`);
}

main().catch((e) => { console.error("FATAL", e); process.exit(1); });
