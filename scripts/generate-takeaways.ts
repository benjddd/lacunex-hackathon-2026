// Generate takeaway-<sid>.md for every session in a given local round, by
// driving the running dev server's /api/takeaway endpoint with mode="final".
//
// Used to pre-bake takeaways for the seeded demo cohort so a judge clicking
// into a session detail sees the participant's reflective letter (currently
// the seeded round has takeaways=0). Re-run seed-cohort.ts afterwards to
// push the markdowns to prod KV.
//
// Usage (dev server must be running on http://localhost:3000):
//   npx tsx scripts/generate-takeaways.ts --round=2026-04-24T21-21-52-268Z
//   npx tsx scripts/generate-takeaways.ts --round=<id> --skip-existing

import * as fs from "node:fs";
import * as path from "node:path";

interface Args {
  roundId: string;
  skipExisting: boolean;
}

function parseArgs(argv: string[]): Args {
  const out: Partial<Args> = { skipExisting: false };
  for (const raw of argv) {
    if (raw === "--skip-existing") out.skipExisting = true;
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (!m) continue;
    if (m[1] === "round") out.roundId = m[2];
  }
  if (!out.roundId) throw new Error("missing --round=<id>");
  return out as Args;
}

interface SessionDoc {
  session_id: string;
  template_id: string;
  template_json?: unknown;
  transcript: unknown[];
  extraction: unknown;
}

interface RoundDoc {
  session_ids: string[];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const transcriptsDir = path.join(process.cwd(), "transcripts");
  const roundPath = path.join(transcriptsDir, "rounds", `round-${args.roundId}.json`);
  if (!fs.existsSync(roundPath)) {
    throw new Error(`round file not found: ${roundPath}`);
  }
  const round = JSON.parse(fs.readFileSync(roundPath, "utf8")) as RoundDoc;
  process.stdout.write(`Round: ${args.roundId} · ${round.session_ids.length} sessions\n`);

  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (const sid of round.session_ids) {
    const sessionPath = path.join(transcriptsDir, `session-${sid}.json`);
    const takeawayPath = path.join(transcriptsDir, `takeaway-${sid}.md`);
    if (!fs.existsSync(sessionPath)) {
      process.stderr.write(`  ! ${sid}: session file missing — skipping\n`);
      failed++;
      continue;
    }
    if (args.skipExisting && fs.existsSync(takeawayPath)) {
      process.stdout.write(`  · ${sid}: takeaway exists — skipping\n`);
      skipped++;
      continue;
    }

    const session = JSON.parse(fs.readFileSync(sessionPath, "utf8")) as SessionDoc;
    process.stdout.write(`  · ${sid}: requesting takeaway… `);
    const t0 = Date.now();
    try {
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
      if (!res.ok || !data.markdown) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      fs.writeFileSync(takeawayPath, data.markdown, "utf8");
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      process.stdout.write(`ok (${elapsed}s, ${data.markdown.length} chars)\n`);
      made++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stdout.write(`FAILED: ${msg}\n`);
      failed++;
    }
  }

  process.stdout.write(
    `\nDone — made=${made} skipped=${skipped} failed=${failed}\n`
  );
  process.stdout.write(
    `\nNext: re-seed prod with the new takeaways:\n  npx tsx --env-file=.env.production.local scripts/seed-cohort.ts --round=${args.roundId} --target=https://lacunex.com\n`
  );
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`generate-takeaways failed: ${msg}\n`);
  process.exit(1);
});
