// Upload local media files to an existing Descript project via the V50 REST API.
//
//   node --env-file=.env.local scripts/descript-upload-media.mjs
//
// Steps per file:
//   1. POST /v1/jobs/import/project_media with {project_id, add_media:{name:{content_type,file_size}}}
//      → returns {upload_urls:{name:{upload_url, asset_id, artifact_id}}}
//   2. PUT the file bytes to upload_url with Content-Type: application/octet-stream
//   3. (The import job runs server-side; poll GET /v1/projects/<id> for media_files entry)
//
// Files batched in groups; 3s sleep between API calls to avoid the 429 the user hit.

import * as fs from "node:fs";
import * as path from "node:path";

const TOKEN = process.env.DESCRIPT_API_TOKEN;
if (!TOKEN) {
  console.error("DESCRIPT_API_TOKEN missing");
  process.exit(1);
}

const PROJECT_ID = "e6f79efe-e138-4bb0-a620-07066838bc49";
const BASE = "https://descriptapi.com/v1";
const SRC_DIR = "transcripts/captures/_descript";

// s1-question.png already uploaded in earlier probe — skip
const FILES = (process.env.DESCRIPT_FILES?.split(",").filter(Boolean)) ?? [
  "beat1-map-21s.mp4",
  "beat4-left-pane-only.mp4",
  "beat5-speed-ramped.mp4",      // user spec said -tinted but only this exists
  "beat7-letter-22s.mp4",
  "beat9-brief-designer-8s.mp4",
  "s2-personal.png",
  "s8-architecture.png",
  "s10-close.png",
  "beat4-full-split-tinted.mp4", // 210MB — last so smaller files land first
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

async function importJob(name, contentType, fileSize) {
  const body = {
    project_id: PROJECT_ID,
    add_media: { [name]: { content_type: contentType, file_size: fileSize } },
  };
  const res = await fetch(`${BASE}/jobs/import/project_media`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (res.status !== 201) throw new Error(`import job ${res.status}: ${text.slice(0, 300)}`);
  const json = JSON.parse(text);
  const u = json.upload_urls?.[name];
  if (!u?.upload_url) throw new Error(`no upload_url in response: ${text.slice(0, 300)}`);
  return { jobId: json.job_id, uploadUrl: u.upload_url, assetId: u.asset_id };
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

async function getJob(jobId) {
  const res = await fetch(`${BASE}/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`get job ${res.status}`);
  return res.json();
}

async function waitForJob(jobId, label = "") {
  // Poll until job_state is not "running". Cap at ~6 min for the 210MB file.
  const deadline = Date.now() + 6 * 60 * 1000;
  let last = "";
  while (Date.now() < deadline) {
    const j = await getJob(jobId);
    if (j.job_state !== last) {
      console.log(`    ${label} job_state=${j.job_state}`);
      last = j.job_state;
    }
    if (j.job_state !== "running" && j.job_state !== "queued" && j.job_state !== "pending") return j;
    await sleep(4000);
  }
  return { job_state: "timeout" };
}

async function uploadOne(name) {
  const filePath = path.join(SRC_DIR, name);
  const stat = fs.statSync(filePath);
  const ext = path.extname(name).toLowerCase();
  const ct = CONTENT_TYPES[ext] ?? "application/octet-stream";
  console.log(`[${name}] ${(stat.size / 1024 / 1024).toFixed(2)} MB ${ct}`);

  // Retry the import-job POST in case the previous job is still running.
  let importRes;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      importRes = await importJob(name, ct, stat.size);
      break;
    } catch (e) {
      if (e.message.includes("429")) {
        console.log(`    queued (attempt ${attempt}); waiting 8s...`);
        await sleep(8000);
        continue;
      }
      throw e;
    }
  }
  if (!importRes) throw new Error("import job stuck behind running queue");

  const { jobId, uploadUrl } = importRes;
  console.log(`  job: ${jobId}`);
  await putFile(uploadUrl, filePath);
  console.log(`  PUT ok`);
  await waitForJob(jobId, name);
  return { name, jobId, ok: true };
}

async function listProjectMedia() {
  const res = await fetch(`${BASE}/projects/${PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`list ${res.status}`);
  const json = await res.json();
  return Object.keys(json.media_files ?? {});
}

async function main() {
  console.log(`token: ${TOKEN.slice(0, 8)}...  project: ${PROJECT_ID}`);
  console.log(`uploading ${FILES.length} files\n`);

  const results = [];
  for (const name of FILES) {
    try {
      results.push(await uploadOne(name));
    } catch (err) {
      console.error(`  FAIL ${name}: ${err.message}`);
      results.push({ name, ok: false, error: err.message });
    }
    await sleep(3000); // rate limit cushion
  }

  console.log(`\nWaiting 8s for server-side import jobs to land...`);
  await sleep(8000);

  console.log(`\n=== Project media_files now ===`);
  try {
    const keys = await listProjectMedia();
    for (const k of keys) console.log(`  ${k}`);
    console.log(`\ntotal: ${keys.length}`);
  } catch (e) {
    console.error(`list failed: ${e.message}`);
  }

  console.log(`\n=== Summary ===`);
  for (const r of results) console.log(`  ${r.ok ? "OK" : "FAIL"}  ${r.name}${r.error ? "  " + r.error : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
