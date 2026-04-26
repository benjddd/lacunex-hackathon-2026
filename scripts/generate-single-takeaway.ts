// One-off: generate a takeaway-<sid>.md for a single session.
// (generate-takeaways.ts requires a round; this is for ad-hoc winning sims.)
//
//   npx tsx scripts/generate-single-takeaway.ts --session=<id>

import * as fs from "node:fs";
import * as path from "node:path";

interface SessionDoc {
  session_id: string;
  template_id: string;
  template_json?: unknown;
  transcript: unknown[];
  extraction: unknown;
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith("--session="));
  if (!arg) throw new Error("missing --session=<id>");
  const sid = arg.replace("--session=", "");
  const transcriptsDir = path.join(process.cwd(), "transcripts");
  const sessionPath = path.join(transcriptsDir, `session-${sid}.json`);
  if (!fs.existsSync(sessionPath)) throw new Error(`session file not found: ${sessionPath}`);
  const session = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as SessionDoc;

  process.stdout.write(`Generating takeaway for ${sid}...\n`);
  const t0 = Date.now();
  const res = await fetch("http://localhost:3000/api/takeaway", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      templateId: session.template_id,
      templateJson: session.template_json ?? undefined,
      sessionId: sid,
      transcript: session.transcript,
      extraction: session.extraction,
      mode: "final",
    }),
  });
  const data = (await res.json()) as { markdown?: string; error?: string };
  if (!res.ok || !data.markdown) throw new Error(data.error ?? `HTTP ${res.status}`);
  const out = path.join(transcriptsDir, `takeaway-${sid}.md`);
  fs.writeFileSync(out, data.markdown, "utf8");
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  process.stdout.write(`OK (${elapsed}s, ${data.markdown.length} chars) → ${out}\n`);
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`failed: ${msg}\n`);
  process.exit(1);
});
