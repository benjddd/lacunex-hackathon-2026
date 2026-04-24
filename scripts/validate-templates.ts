/* eslint-disable @typescript-eslint/no-explicit-any */
// Smoke test for the brief templates in src/templates/*.json.
//
// Every template is MIT-licensed, committed content that the live app loads
// and hands to Claude as system-prompt material. A syntactically-valid JSON
// that's missing `meta_notice_hints` or has an objective without
// `sub_questions` will silently degrade the interview. This script catches
// those before they hit production.
//
// Invariants enforced (kept deliberately narrow — runtime types do the heavy
// lifting, this is a committed-content sanity check):
//   1. Required top-level fields present (template_id, name, objectives[], ...)
//   2. Every objective has id/label/priority/goal, non-empty sub_questions,
//      non-empty probing_strategies, and an extraction_schema object
//   3. At least one objective has priority=high
//   4. meta_noticing_layer.notice_types is non-empty
//   5. takeaway_artifact.sections is non-empty
//   6. role_labels has host/participant when present
//   7. template_id matches filename stem
//
// Usage:
//   npm run validate:templates
//   npx tsx scripts/validate-templates.ts --strict   # non-zero exit on any failure

import * as fs from "node:fs";
import * as path from "node:path";

interface Issue {
  template: string;
  path: string;
  message: string;
  severity: "error" | "warn";
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function isNonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validate(file: string, data: any): Issue[] {
  const issues: Issue[] = [];
  const tid = data?.template_id ?? "(missing)";

  // 1. Required top-level fields
  for (const field of [
    "template_id",
    "version",
    "name",
    "description",
    "interviewer_persona",
    "session_shape",
    "objectives",
    "meta_noticing_layer",
    "takeaway_artifact",
  ]) {
    if (data?.[field] === undefined || data?.[field] === null) {
      issues.push({
        template: tid,
        path: field,
        message: `required field missing`,
        severity: "error",
      });
    }
  }

  if (!isNonEmptyString(data?.template_id)) {
    issues.push({
      template: tid,
      path: "template_id",
      message: "must be non-empty string",
      severity: "error",
    });
  }

  // 7. template_id must match filename stem.
  const stem = path.basename(file, ".json");
  if (isNonEmptyString(data?.template_id) && data.template_id !== stem) {
    issues.push({
      template: tid,
      path: "template_id",
      message: `template_id "${data.template_id}" does not match filename stem "${stem}"`,
      severity: "error",
    });
  }

  // 2. Objectives checks
  const objectives = Array.isArray(data?.objectives) ? data.objectives : [];
  if (objectives.length === 0) {
    issues.push({
      template: tid,
      path: "objectives",
      message: "must contain at least one objective",
      severity: "error",
    });
  }

  let hasHigh = false;
  for (let i = 0; i < objectives.length; i++) {
    const o = objectives[i];
    const here = `objectives[${i}]`;
    for (const f of ["id", "label", "priority", "goal", "success_criteria"]) {
      if (!isNonEmptyString(o?.[f])) {
        issues.push({
          template: tid,
          path: `${here}.${f}`,
          message: "missing or empty",
          severity: "error",
        });
      }
    }
    if (o?.priority === "high") hasHigh = true;
    if (!["high", "medium", "low"].includes(o?.priority)) {
      issues.push({
        template: tid,
        path: `${here}.priority`,
        message: `must be high|medium|low, got ${JSON.stringify(o?.priority)}`,
        severity: "error",
      });
    }
    if (!isNonEmptyArray(o?.sub_questions)) {
      issues.push({
        template: tid,
        path: `${here}.sub_questions`,
        message: "must be non-empty array",
        severity: "error",
      });
    }
    if (!isNonEmptyArray(o?.probing_strategies)) {
      issues.push({
        template: tid,
        path: `${here}.probing_strategies`,
        message: "must be non-empty array",
        severity: "error",
      });
    }
    if (!isObject(o?.extraction_schema)) {
      issues.push({
        template: tid,
        path: `${here}.extraction_schema`,
        message: "must be an object",
        severity: "error",
      });
    }
    // meta_notice_hints: soft — warn if missing, objectives can be valid
    // without them (e.g. brief-designer uses fewer hints per objective).
    if (!Array.isArray(o?.meta_notice_hints)) {
      issues.push({
        template: tid,
        path: `${here}.meta_notice_hints`,
        message: "should be an array (even if empty)",
        severity: "warn",
      });
    }
  }

  // 3. At least one high-priority objective.
  if (objectives.length > 0 && !hasHigh) {
    issues.push({
      template: tid,
      path: "objectives",
      message: "no objective has priority=high — conductor won't know what to anchor on",
      severity: "error",
    });
  }

  // 4. meta_noticing_layer.notice_types non-empty
  const mnl = data?.meta_noticing_layer;
  if (!isNonEmptyArray(mnl?.notice_types)) {
    issues.push({
      template: tid,
      path: "meta_noticing_layer.notice_types",
      message: "must be non-empty array",
      severity: "error",
    });
  } else {
    for (let i = 0; i < mnl.notice_types.length; i++) {
      const nt = mnl.notice_types[i];
      if (!isNonEmptyString(nt?.id) || !isNonEmptyString(nt?.description) || !isNonEmptyString(nt?.deploy_as)) {
        issues.push({
          template: tid,
          path: `meta_noticing_layer.notice_types[${i}]`,
          message: "notice must have id, description, and deploy_as",
          severity: "error",
        });
      }
    }
  }

  // 5. takeaway_artifact.sections non-empty
  const ta = data?.takeaway_artifact;
  if (!isNonEmptyArray(ta?.sections)) {
    issues.push({
      template: tid,
      path: "takeaway_artifact.sections",
      message: "must be non-empty array",
      severity: "error",
    });
  } else {
    for (let i = 0; i < ta.sections.length; i++) {
      const s = ta.sections[i];
      if (!isNonEmptyString(s?.id) || !isNonEmptyString(s?.label) || !isNonEmptyString(s?.contents)) {
        issues.push({
          template: tid,
          path: `takeaway_artifact.sections[${i}]`,
          message: "section must have id, label, contents",
          severity: "error",
        });
      }
    }
  }

  // 6. role_labels shape
  if (data?.role_labels !== undefined) {
    if (!isObject(data.role_labels)) {
      issues.push({
        template: tid,
        path: "role_labels",
        message: "must be an object",
        severity: "error",
      });
    } else {
      if (!isNonEmptyString(data.role_labels.host) || !isNonEmptyString(data.role_labels.participant)) {
        issues.push({
          template: tid,
          path: "role_labels",
          message: "must have non-empty host and participant",
          severity: "error",
        });
      }
    }
  }

  // domain_context soft check — present on all briefs we care about.
  if (!isNonEmptyString(data?.domain_context)) {
    issues.push({
      template: tid,
      path: "domain_context",
      message: "missing — brief will work but loses the research-backed axioms Lacunex is designed around",
      severity: "warn",
    });
  }

  return issues;
}

function main() {
  const strict = process.argv.includes("--strict");
  const dir = path.resolve(process.cwd(), "src", "templates");
  if (!fs.existsSync(dir)) {
    process.stderr.write(`templates dir not found: ${dir}\n`);
    process.exit(2);
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    process.stderr.write(`no template .json files in ${dir}\n`);
    process.exit(2);
  }

  const allIssues: Issue[] = [];
  const perTemplate: Array<{ file: string; template_id: string; errors: number; warns: number }> = [];

  for (const f of files) {
    const full = path.join(dir, f);
    let data: any;
    try {
      data = JSON.parse(fs.readFileSync(full, "utf8"));
    } catch (err) {
      allIssues.push({
        template: f,
        path: "(parse)",
        message: `invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
        severity: "error",
      });
      perTemplate.push({ file: f, template_id: "(parse error)", errors: 1, warns: 0 });
      continue;
    }
    const issues = validate(full, data);
    const errors = issues.filter((i) => i.severity === "error").length;
    const warns = issues.filter((i) => i.severity === "warn").length;
    perTemplate.push({ file: f, template_id: data?.template_id ?? "(?)", errors, warns });
    allIssues.push(...issues);
  }

  // Summary line first.
  process.stdout.write(`validated ${files.length} template(s)\n`);
  for (const r of perTemplate) {
    const tag = r.errors > 0 ? "FAIL" : r.warns > 0 ? "WARN" : "OK";
    process.stdout.write(
      `  [${tag}] ${r.file.padEnd(32)} errors=${r.errors}  warns=${r.warns}\n`
    );
  }

  if (allIssues.length > 0) {
    process.stdout.write(`\nDetails:\n`);
    for (const i of allIssues) {
      process.stdout.write(
        `  [${i.severity.toUpperCase()}] ${i.template} — ${i.path}: ${i.message}\n`
      );
    }
  }

  const errCount = allIssues.filter((i) => i.severity === "error").length;
  if (errCount > 0) {
    process.stderr.write(`\n${errCount} error(s) across ${files.length} template(s)\n`);
    if (strict) process.exit(1);
  }
}

main();
