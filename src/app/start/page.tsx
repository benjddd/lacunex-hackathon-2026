"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import { DEFAULT_ROLE_LABELS, type Template } from "@/lib/types";

const BRIEFS: Template[] = [
  founderTemplate as unknown as Template,
  postIncidentTemplate as unknown as Template,
  civicTemplate as unknown as Template,
];

const HOOKS: Record<string, string> = {
  "founder-product-ideation": "Walk me through the moment you realised you were solving a real problem — not a hypothesis, a moment.",
  "post-incident-witness": "Before we look at any reports — tell me what you personally saw or heard in the minutes before the incident.",
  "civic-consultation": "Forget the options on the table for a second. What outcome would make you feel this process was worth your time?",
};

export default function StartPage() {
  const router = useRouter();
  const [showGenerator, setShowGenerator] = useState(false);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<Template | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!description.trim() || generating) return;
    setGenerating(true);
    setGenError(null);
    setGeneratedBrief(null);
    try {
      const res = await fetch("/api/generate-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });
      const data = (await res.json()) as { template?: Template; error?: string };
      if (!res.ok || !data.template) throw new Error(data.error ?? `HTTP ${res.status}`);
      setGeneratedBrief(data.template);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleStartGenerated = () => {
    if (!generatedBrief) return;
    // Store in sessionStorage so the participant page can retrieve it
    sessionStorage.setItem(
      `lacunex:brief:${generatedBrief.template_id}`,
      JSON.stringify(generatedBrief)
    );
    router.push(`/p/${generatedBrief.template_id}`);
  };

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              Lacunex
            </h1>
            <p className="text-xs text-stone-500">Start a conversation</p>
          </div>
          <Link
            href="/host"
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
          >
            Host dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 text-center">
          <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
            A 15-minute adaptive interview. No questionnaire — every question is
            decided turn by turn based on what you say. You leave with a
            reflective summary written for you.
          </p>
        </div>

        <div className="space-y-4">
          {BRIEFS.map((brief) => {
            const roleLabels = brief.role_labels ?? DEFAULT_ROLE_LABELS;
            const hook = HOOKS[brief.template_id] ?? "";
            return (
              <div
                key={brief.template_id}
                className="rounded-xl border border-stone-200 bg-white p-6 transition hover:border-amber-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-stone-900">
                      {brief.name}
                    </h2>
                    <p className="mt-0.5 text-[11px] text-stone-500 uppercase tracking-wider">
                      {roleLabels.host} · {roleLabels.participant}
                    </p>
                    <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                      {brief.description}
                    </p>
                    {hook && (
                      <p className="mt-3 text-[11px] italic text-stone-400 border-l-2 border-stone-200 pl-3">
                        &ldquo;{hook}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col gap-2">
                    <Link
                      href={`/p/${brief.template_id}`}
                      className="rounded-md bg-amber-600 px-4 py-2 text-center text-xs font-medium text-white hover:bg-amber-700 whitespace-nowrap"
                    >
                      Start as {roleLabels.participant}
                    </Link>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {brief.objectives.slice(0, 4).map((obj) => (
                    <span
                      key={obj.id}
                      className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600"
                    >
                      {obj.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* NL brief generator */}
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white">
          <button
            type="button"
            onClick={() => setShowGenerator((v) => !v)}
            className="flex w-full items-center justify-between px-6 py-4 text-left"
          >
            <div>
              <p className="text-sm font-medium text-stone-700">
                Don&apos;t see your use case?
              </p>
              <p className="text-xs text-stone-500">
                Describe what you want to learn — we&apos;ll generate a custom brief.
              </p>
            </div>
            <span className="text-stone-400 text-sm">{showGenerator ? "↑" : "↓"}</span>
          </button>

          {showGenerator && (
            <div className="border-t border-stone-100 px-6 pb-6 pt-4 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500">
                  What are you trying to learn?
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. I want to understand how frontline nurses make triage decisions under time pressure — specifically what information they use and what they ignore."
                  rows={3}
                  disabled={generating}
                  className="mt-1.5 w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none resize-none disabled:opacity-50"
                />
              </div>

              {genError && (
                <p className="text-xs text-red-600">{genError}</p>
              )}

              {!generatedBrief && (
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  disabled={!description.trim() || generating}
                  className="rounded-md bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-40"
                >
                  {generating ? "Generating brief…" : "Generate custom brief"}
                </button>
              )}

              {generatedBrief && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{generatedBrief.name}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-stone-500">
                      {generatedBrief.role_labels?.host} · {generatedBrief.role_labels?.participant}
                    </p>
                    <p className="mt-1.5 text-xs text-stone-600">{generatedBrief.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedBrief.objectives.slice(0, 5).map((obj) => (
                      <span
                        key={obj.id}
                        className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] text-stone-700 ring-1 ring-stone-200"
                      >
                        {obj.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleStartGenerated}
                      className="rounded-md bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                    >
                      Start with this brief →
                    </button>
                    <button
                      type="button"
                      onClick={() => { setGeneratedBrief(null); setDescription(""); }}
                      className="text-xs text-stone-500 underline hover:text-stone-700"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mt-10 text-center text-[11px] text-stone-400">
          No account required. Your transcript stays in your browser tab.
          The host receives structured insight; you receive your reflective takeaway at the end.
        </p>
      </main>
    </div>
  );
}
