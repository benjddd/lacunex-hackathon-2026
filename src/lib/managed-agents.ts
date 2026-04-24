/* eslint-disable @typescript-eslint/no-explicit-any */
// Managed Agents integration — claim verifier.
//
// A single turn against the Lacunex claim-verifier Managed Agent:
//   1. Open a session bound to the agent and container environment.
//   2. Send the transcript as a user.message.
//   3. Stream session events, forwarding each to the caller via `onEvent`
//      so the UI can render the agent's thinking / tool use / message live.
//   4. Accumulate agent.message text and return once the session goes idle
//      with stop_reason = end_turn (or terminates).
//
// The Agent + Environment are provisioned out-of-band by
// scripts/spike-managed-agents-e2e.ts (or the same idempotent provisioning
// on first use in production). Their IDs come from env vars:
//   LACUNEX_CLAIM_VERIFIER_AGENT_ID
//   LACUNEX_CLAIM_VERIFIER_ENV_ID

import { getAnthropic } from "./anthropic";

export type ManagedAgentUIEvent =
  | { type: "status"; status: "running" | "idle" | "terminated"; stop_reason?: string }
  | { type: "thinking" }
  | { type: "tool_use"; name: string; input: unknown }
  | { type: "tool_result"; is_error: boolean; block_count: number }
  | { type: "message_text"; text: string }
  | { type: "error"; message: string };

export interface ClaimVerifierResult {
  report: string;
  session_id: string;
  active_seconds?: number;
  input_tokens?: number;
  output_tokens?: number;
  cache_read_input_tokens?: number;
}

export interface ManagedAgentIds {
  agentId: string;
  environmentId: string;
}

export function getClaimVerifierIds(): ManagedAgentIds {
  const agentId = process.env.LACUNEX_CLAIM_VERIFIER_AGENT_ID;
  const environmentId = process.env.LACUNEX_CLAIM_VERIFIER_ENV_ID;
  if (!agentId || !environmentId) {
    throw new Error(
      "Managed Agent not provisioned — LACUNEX_CLAIM_VERIFIER_AGENT_ID and LACUNEX_CLAIM_VERIFIER_ENV_ID must be set. Run `npx tsx scripts/spike-managed-agents-e2e.ts` to create them."
    );
  }
  return { agentId, environmentId };
}

export async function runClaimVerifierAgent(params: {
  transcriptText: string;
  onEvent: (ev: ManagedAgentUIEvent) => void;
  signal?: AbortSignal;
}): Promise<ClaimVerifierResult> {
  const { transcriptText, onEvent, signal } = params;
  const { agentId, environmentId } = getClaimVerifierIds();
  const client = getAnthropic();

  const session = await client.beta.sessions.create({
    agent: agentId,
    environment_id: environmentId,
    title: "Lacunex claim verification",
  });

  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [{ type: "text", text: transcriptText }],
      },
    ],
  });

  const stream = await client.beta.sessions.events.stream(session.id);

  const reportChunks: string[] = [];
  let done = false;
  let finalStopReason: string | undefined;

  try {
    for await (const ev of stream as AsyncIterable<any>) {
      if (signal?.aborted) break;
      switch (ev.type) {
        case "session.status_running":
          onEvent({ type: "status", status: "running" });
          break;
        case "session.status_idle": {
          const stop = ev.stop_reason?.type as string | undefined;
          finalStopReason = stop;
          onEvent({ type: "status", status: "idle", stop_reason: stop });
          if (stop === "end_turn" || stop === "retries_exhausted" || stop === "requires_action") {
            done = true;
          }
          break;
        }
        case "session.status_terminated":
          onEvent({ type: "status", status: "terminated" });
          done = true;
          break;
        case "session.error":
          onEvent({
            type: "error",
            message: `${ev.error?.type ?? "error"}: ${ev.error?.message ?? "unknown"}`,
          });
          break;
        case "agent.thinking":
          onEvent({ type: "thinking" });
          break;
        case "agent.tool_use":
          onEvent({ type: "tool_use", name: ev.name, input: ev.input });
          break;
        case "agent.tool_result":
          onEvent({
            type: "tool_result",
            is_error: !!ev.is_error,
            block_count: Array.isArray(ev.content) ? ev.content.length : 0,
          });
          break;
        case "agent.message": {
          const text = (ev.content ?? [])
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text as string)
            .join("");
          if (text) {
            reportChunks.push(text);
            onEvent({ type: "message_text", text });
          }
          break;
        }
        default:
          // ignore span.*, agent.thread_context_compacted, etc.
          break;
      }
      if (done) break;
    }
  } finally {
    if (typeof (stream as any).controller?.abort === "function") {
      try {
        (stream as any).controller.abort();
      } catch {
        // best-effort cleanup
      }
    }
  }

  const final = await client.beta.sessions.retrieve(session.id);
  const usage = final.usage ?? {};
  const stats = final.stats ?? {};

  const report = reportChunks.join("\n\n").trim();
  if (!report) {
    throw new Error(
      `agent produced no text (stop_reason=${finalStopReason ?? "unknown"}, session=${session.id})`
    );
  }
  return {
    report,
    session_id: session.id,
    active_seconds: stats.active_seconds,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
  };
}
