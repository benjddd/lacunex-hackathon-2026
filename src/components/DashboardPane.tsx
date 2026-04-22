"use client";

import type { ExtractionState, Template } from "@/lib/types";

interface DashboardPaneProps {
  template: Template;
  extraction: ExtractionState;
  activeObjectiveId: string | null;
}

export function DashboardPane({
  template,
  extraction,
  activeObjectiveId,
}: DashboardPaneProps) {
  return (
    <div className="flex h-full flex-col border-l border-stone-200 bg-white">
      <header className="border-b border-stone-200 px-6 py-4">
        <h2 className="text-xs uppercase tracking-widest text-stone-500">
          Host dashboard
        </h2>
        <p className="mt-1 text-sm font-medium text-stone-900">
          {template.name}
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {template.objectives.map((obj) => {
          const state = extraction.per_objective[obj.id];
          const active = obj.id === activeObjectiveId;
          return (
            <ObjectiveCard
              key={obj.id}
              label={obj.label}
              priority={obj.priority}
              completeness={state?.completeness ?? 0}
              confidence={state?.confidence ?? 0}
              keyQuotes={state?.key_quotes ?? []}
              fields={state?.fields ?? {}}
              isActive={active}
            />
          );
        })}

        {(extraction.cross_objective.emerging_themes.length > 0 ||
          extraction.cross_objective.session_heat) && (
          <div className="mt-6 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
            <h3 className="text-xs uppercase tracking-wider text-stone-500 mb-2">
              Session signal
            </h3>
            {extraction.cross_objective.session_heat && (
              <p className="text-sm text-stone-800 mb-2">
                {extraction.cross_objective.session_heat}
              </p>
            )}
            {extraction.cross_objective.emerging_themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {extraction.cross_objective.emerging_themes.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ObjectiveCardProps {
  label: string;
  priority: string;
  completeness: number;
  confidence: number;
  keyQuotes: { turn: number; text: string }[];
  fields: Record<string, unknown>;
  isActive: boolean;
}

function ObjectiveCard({
  label,
  priority,
  completeness,
  confidence,
  keyQuotes,
  fields,
  isActive,
}: ObjectiveCardProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 transition ${
        isActive
          ? "border-amber-400 bg-amber-50/30 shadow-sm"
          : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-stone-900">{label}</h3>
        <span
          className={`text-[10px] uppercase tracking-wider ${
            priority === "high"
              ? "text-amber-700"
              : priority === "medium"
                ? "text-stone-500"
                : "text-stone-400"
          }`}
        >
          {priority}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${Math.round(completeness * 100)}%` }}
          />
        </div>
        <span className="text-[11px] tabular-nums text-stone-500">
          {Math.round(completeness * 100)}%
        </span>
      </div>

      {(() => {
        const visible = Object.entries(fields).filter(([, v]) => !isEmptyValue(v));
        if (visible.length === 0) return null;
        return (
          <dl className="mt-3 space-y-1.5 text-[12px] leading-snug">
            {visible.map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="shrink-0 text-stone-500">{humanizeKey(k)}:</dt>
                <dd className="text-stone-800">{renderFieldValue(v)}</dd>
              </div>
            ))}
          </dl>
        );
      })()}

      {keyQuotes.length > 0 && (
        <div className="mt-3 space-y-1">
          {keyQuotes.slice(0, 2).map((q, i) => (
            <blockquote
              key={`${q.turn}-${i}`}
              className="border-l-2 border-amber-300 pl-2 text-[11px] italic text-stone-700"
            >
              &ldquo;{q.text}&rdquo;
            </blockquote>
          ))}
        </div>
      )}

      {confidence > 0 && (
        <p className="mt-2 text-[10px] text-stone-400">
          confidence {Math.round(confidence * 100)}%
        </p>
      )}
    </div>
  );
}

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function humanizeKey(key: string): string {
  // snake_case -> Title Case with spaces. Single edit surface for key display.
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderFieldValue(v: unknown): React.ReactNode {
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    // Array of primitives: comma-join. Array of objects: bullet list.
    const firstItem = v[0];
    if (
      typeof firstItem === "string" ||
      typeof firstItem === "number" ||
      typeof firstItem === "boolean"
    ) {
      return v.join(", ");
    }
    return (
      <ul className="space-y-1">
        {v.map((item, i) => (
          <li key={i} className="flex gap-1">
            <span className="text-stone-400">·</span>
            <span>{renderObjectSummary(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (typeof v === "object" && v !== null) {
    return renderObjectSummary(v);
  }
  return String(v);
}

function renderObjectSummary(obj: unknown): string {
  if (typeof obj !== "object" || obj === null) return String(obj);
  // For objects like { statement, evidence_status, ... } render
  // "statement" first (if present), then append qualifiers.
  const entries = Object.entries(obj).filter(([, v]) => !isEmptyValue(v));
  if (entries.length === 0) return "";
  // Prefer a main "statement"-like field as the leading phrase.
  const mainKeys = ["statement", "description", "text", "label"];
  const mainEntry = entries.find(([k]) => mainKeys.includes(k));
  if (mainEntry) {
    const rest = entries.filter(([k]) => k !== mainEntry[0]);
    const restStr = rest
      .map(([k, v]) => `${humanizeKey(k)}: ${String(v)}`)
      .join(" · ");
    return restStr ? `${String(mainEntry[1])} (${restStr})` : String(mainEntry[1]);
  }
  return entries.map(([k, v]) => `${humanizeKey(k)}: ${String(v)}`).join(" · ");
}
