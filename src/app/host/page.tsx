"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import founderTemplate from "@/templates/founder-product-ideation.json";
import postIncidentTemplate from "@/templates/post-incident-witness.json";
import civicTemplate from "@/templates/civic-consultation.json";
import { DEFAULT_ROLE_LABELS, type Round, type Template } from "@/lib/types";

const AVAILABLE_BRIEFS: Template[] = [
  founderTemplate as unknown as Template,
  postIncidentTemplate as unknown as Template,
  civicTemplate as unknown as Template,
];

export default function HostPage() {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [roundsError, setRoundsError] = useState<string | null>(null);
  const [invitingBrief, setInvitingBrief] = useState<string | null>(null);
  const [invites, setInvites] = useState<Record<string, { url: string; token: string }>>({});
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const createInvite = async (templateId: string) => {
    setInvitingBrief(templateId);
    setInviteError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const data = (await res.json()) as {
        invite?: { token: string; template_id: string };
        error?: string;
      };
      if (!res.ok || !data.invite) throw new Error(data.error ?? `HTTP ${res.status}`);
      const url = `${window.location.origin}/i/${data.invite.token}`;
      setInvites((prev) => ({
        ...prev,
        [templateId]: { url, token: data.invite!.token },
      }));
      try {
        await navigator.clipboard.writeText(url);
        setCopied(templateId);
        setTimeout(() => setCopied((c) => (c === templateId ? null : c)), 2000);
      } catch {
        // clipboard may be blocked; URL is still visible
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : String(err));
    } finally {
      setInvitingBrief(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/rounds");
        const data = (await res.json()) as {
          rounds?: Round[];
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
        if (!cancelled) {
          setRounds(data.rounds ?? []);
        }
      } catch (err) {
        if (!cancelled)
          setRoundsError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-6 py-3">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-stone-900">
              Lacunex
            </h1>
            <p className="text-xs text-stone-500">Host dashboard</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/start"
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              Custom brief
            </Link>
            <Link
              href="/sessions"
              className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs text-stone-700 hover:bg-stone-50"
            >
              Past sessions
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 space-y-10">
        {/* Start a live session */}
        <section>
          <h2 className="mb-1 text-xs uppercase tracking-wider text-stone-500">
            Run a session
          </h2>
          <p className="mb-4 text-sm text-stone-600">
            Pick a brief to open a combined host+participant view. In a real
            deployment, the participant gets the{" "}
            <code className="rounded bg-stone-100 px-1 py-0.5 text-[11px]">
              /p/[brief]
            </code>{" "}
            link; you watch the dashboard separately.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {AVAILABLE_BRIEFS.map((t) => {
              const roleLabels = t.role_labels ?? DEFAULT_ROLE_LABELS;
              const invite = invites[t.template_id];
              return (
                <div
                  key={t.template_id}
                  className="rounded-xl border border-stone-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-stone-900">
                        {t.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        {roleLabels.host} · {roleLabels.participant}
                      </p>
                      <p className="mt-2 text-xs text-stone-600 leading-relaxed line-clamp-3">
                        {t.description}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Link
                      href={`/demo?brief=${t.template_id}`}
                      className="flex-1 rounded-md bg-amber-600 px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-amber-700"
                    >
                      Combined view
                    </Link>
                    <button
                      type="button"
                      onClick={() => createInvite(t.template_id)}
                      disabled={invitingBrief === t.template_id}
                      className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                    >
                      {invitingBrief === t.template_id
                        ? "Creating…"
                        : copied === t.template_id
                        ? "Copied ✓"
                        : invite
                        ? "New invite"
                        : "Create invite link"}
                    </button>
                  </div>
                  {invite && (
                    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/40 p-2">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-800">
                        Invite link — share with participant
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-white px-2 py-1 text-[11px] text-stone-800 border border-stone-200 select-all">
                          {invite.url}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(invite.url);
                            setCopied(t.template_id);
                            setTimeout(
                              () => setCopied((c) => (c === t.template_id ? null : c)),
                              2000
                            );
                          }}
                          className="shrink-0 rounded border border-stone-300 bg-white px-2 py-1 text-[10px] text-stone-700 hover:bg-stone-50"
                        >
                          {copied === t.template_id ? "✓" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {inviteError && (
            <p className="mt-2 text-xs text-red-700">
              Couldn&apos;t create invite: {inviteError}
            </p>
          )}
        </section>

        {/* How the split works */}
        <section className="rounded-xl border border-amber-200 bg-amber-50/40 px-5 py-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-800">
            How screen separation works
          </h2>
          <div className="space-y-1.5 text-xs text-stone-700 leading-relaxed">
            <p>
              <span className="font-medium">Participant view</span> (
              <code className="rounded bg-white/80 px-1">/p/[brief]</code>) — a
              clean, minimal chat interface. No dashboard, no objective bars, no
              meta-notice badges. The participant types, sees responses, and
              receives their reflective takeaway at the end.
            </p>
            <p>
              <span className="font-medium">Combined demo view</span> (
              <code className="rounded bg-white/80 px-1">/demo</code>) — both
              sides in one window. Useful for demos, evaluation, or debugging.
              Shows the host dashboard alongside the chat.
            </p>
            <p>
              <span className="font-medium">Cross-turn reasoning</span> is
              invisible to participants — badges for anchor_return (amber) and
              meta-notices (green) appear only in the combined view.
            </p>
          </div>
        </section>

        {/* Rounds */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-wider text-stone-500">
              Rounds (cross-participant aggregates)
            </h2>
            <div className="flex items-center gap-3">
              <Link href="/rounds" className="text-xs text-amber-700 hover:underline">
                New round →
              </Link>
              <Link href="/rounds" className="text-xs text-stone-500 hover:underline">
                All rounds
              </Link>
            </div>
          </div>

          {roundsError && (
            <p className="text-xs text-red-700">{roundsError}</p>
          )}
          {!rounds && !roundsError && (
            <p className="text-xs text-stone-500">Loading…</p>
          )}
          {rounds && rounds.length === 0 && (
            <div className="rounded-lg border border-stone-200 bg-white px-5 py-4 text-sm text-stone-600">
              No rounds yet.{" "}
              <Link href="/rounds" className="text-amber-700 underline">
                Create a round →
              </Link>
            </div>
          )}
          {rounds && rounds.length > 0 && (
            <ul className="space-y-2">
              {rounds.slice(0, 5).map((r) => (
                <li key={r.round_id}>
                  <Link
                    href={`/rounds/${r.round_id}`}
                    className="flex items-baseline justify-between rounded-lg border border-stone-200 bg-white px-4 py-3 transition hover:border-amber-300 hover:bg-amber-50/20"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-stone-900">
                        {r.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        {r.session_ids.length} session
                        {r.session_ids.length === 1 ? "" : "s"} ·{" "}
                        {new Date(r.created_at).toLocaleDateString()}
                        {r.aggregate && (
                          <span className="ml-2 text-emerald-700">
                            · aggregate ready
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 ml-3 text-[10px] uppercase tracking-wider text-stone-400">
                      {r.status ?? "open"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
