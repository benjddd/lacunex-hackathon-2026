"use client";

import Link from "next/link";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import { DEFAULT_ROLE_LABELS, type Template } from "@/lib/types";

const BRIEFS: Template[] = [
  founderTemplate as unknown as Template,
  postIncidentTemplate as unknown as Template,
  civicTemplate as unknown as Template,
];

// Sample opening hooks to give the viewer a feel for the conversation
const HOOKS: Record<string, string> = {
  "founder-product-ideation": "Walk me through the moment you realised you were solving a real problem — not a hypothesis, a moment.",
  "post-incident-witness": "Before we look at any reports — tell me what you personally saw or heard in the minutes before the incident.",
  "civic-consultation": "Forget the options on the table for a second. What outcome would make you feel this process was worth your time?",
};

export default function StartPage() {
  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-4">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              CaptainSubtext
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

        <p className="mt-10 text-center text-[11px] text-stone-400">
          No account required. Your transcript stays in your browser tab.
          The host receives structured insight; you receive your reflective takeaway at the end.
        </p>
      </main>
    </div>
  );
}
