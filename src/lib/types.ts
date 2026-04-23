// Shared types for CaptainSubtext. The host-facing JSON template defines
// what to learn; everything below is the session's live state.

export type EvidenceStatus = "tested" | "partial" | "untested";
export type EvidenceStrength = "observed" | "inferred" | "assumed";
export type ObjectivePriority = "high" | "medium" | "low";

export interface ObjectiveTemplate {
  id: string;
  label: string;
  priority: ObjectivePriority;
  goal: string;
  sub_questions: string[];
  probing_strategies: string[];
  success_criteria: string;
  // Loose — varies per objective. Renderer treats it as arbitrary fields.
  extraction_schema: Record<string, unknown>;
  meta_notice_hints: string[];
}

export interface InterviewerPersona {
  voice: string;
  stance: string;
  forbidden: string[];
  pacing: string;
}

export interface SessionShape {
  target_duration_minutes: number;
  demo_duration_minutes: number;
  opening: string;
  closing: string;
}

export interface MetaNoticeType {
  id: string;
  description: string;
  deploy_as: string;
}

export interface MetaNoticingLayer {
  description: string;
  notice_types: MetaNoticeType[];
  deploy_rate_cap: string;
  suppression_rules: string[];
}

export interface TakeawaySection {
  id: string;
  label: string;
  contents: string;
}

export interface TakeawayArtifact {
  description: string;
  sections: TakeawaySection[];
  tone: string;
}

export interface RoleLabels {
  host: string; // e.g. "Investor", "Facilitator", "Researcher", "Clinician"
  participant: string; // e.g. "Founder", "Resident", "Expert", "Patient"
}

export interface Template {
  template_id: string;
  version: string;
  name: string;
  description: string;
  role_labels?: RoleLabels; // falls back to "Host" / "Participant"
  interviewer_persona: InterviewerPersona;
  session_shape: SessionShape;
  objectives: ObjectiveTemplate[];
  meta_noticing_layer: MetaNoticingLayer;
  takeaway_artifact: TakeawayArtifact;
  // Domain-specific knowledge the conductor and meta-noticing layer can draw on.
  // Embedded as distilled axioms (not raw documents). Optional — briefs without it
  // still work; briefs with it probe with more precision.
  domain_context?: string;
}

export const DEFAULT_ROLE_LABELS: RoleLabels = {
  host: "Host",
  participant: "Participant",
};

// ---------- Runtime session state ----------

export type TurnRole = "host" | "participant";

export interface Turn {
  index: number; // monotonic from 0 (Host opening = 0)
  role: TurnRole;
  text: string;
  at: string; // ISO timestamp
  // Which objective the conductor was advancing when it produced this turn.
  // Set on host turns; undefined on participant turns. Enables goal→outcome
  // traceability in the dashboard.
  objective_id?: string;
  // Conductor reasoning for this host turn — surfaced in the host view as
  // a collapsible "why this question?" disclosure. Never shown to the
  // participant in the /p/[templateId] route.
  reasoning?: string;
  // When the conductor chose move_type=anchor_return on this Host turn, the
  // anchor_turn is the earlier turn index being re-opened. The UI renders a
  // small "↩ re-opened turn N" chip on the bubble to make cross-turn
  // reasoning visible on camera.
  anchor_turn?: number;
  // When the conductor chose move_type=deploy_meta_notice, this carries the
  // specific notice being deployed. UI renders a subtle badge on the bubble
  // so the cross-turn observation is visible (the notice's transcript
  // anchors prove the kill-rule claim on camera).
  deployed_notice?: {
    type: string;
    anchors: number[];
    observation: string;
  };
}

export interface ObjectiveState {
  id: string;
  // Arbitrary fields matching the objective's extraction_schema.
  fields: Record<string, unknown>;
  completeness: number; // 0..1 vs. success criteria
  confidence: number; // 0..1 how strongly grounded in transcript
  key_quotes: { turn: number; text: string }[];
}

export interface CrossObjectiveState {
  emerging_themes: string[];
  session_heat: string;
}

export interface ExtractionState {
  per_objective: Record<string, ObjectiveState>;
  cross_objective: CrossObjectiveState;
}

export type MoveType =
  | "probe_current"
  | "switch_objective"
  | "deploy_meta_notice"
  | "anchor_return" // N3 — explicitly re-open a prior turn (visible on camera)
  | "wrap_up";

export interface ConductorDecision {
  reasoning: string;
  move_type: MoveType;
  move_target: string;
  next_utterance: string;
  // For anchor_return: the turn index being re-opened. UI renders an anchor
  // chip on the resulting Host bubble to make cross-turn reasoning visible.
  anchor_turn?: number;
}

export interface Session {
  session_id: string;
  template: Template;
  transcript: Turn[];
  extraction: ExtractionState;
  started_at: string; // ISO
  deployed_notices: { turn: number; type: string }[];
}

// ---------- Rounds (cross-participant) ----------
//
// A Round groups N sessions run against the same brief. The same host kicks
// off a round, invites / receives participants, and reads the aggregate
// cross-participant insight. The individual session remains useful on its own
// (each participant gets their reflective takeaway), but the host's primary
// artifact at scale is the Round aggregate, not any one transcript.

export type RoundStatus = "open" | "aggregating" | "closed";

export interface Round {
  round_id: string; // stable timestamp-based id, e.g. "2026-04-23T12-00-00-000Z"
  label: string; // human-facing, e.g. "Q2 founder due diligence cohort"
  template_id: string;
  created_at: string;
  target_participant_count: number | null; // optional planning number
  session_ids: string[]; // ordered insertion order
  status: RoundStatus;
  aggregate: RoundAggregate | null; // populated by POST /api/rounds/[id]/aggregate
  note: string | null;
}

export type AggregatePatternType =
  | "convergent_problem" // most participants name ~same pain
  | "divergent_framing" // participants disagree on what the problem is
  | "shared_assumption" // assumption surfaced in multiple sessions
  | "recurring_hedge" // same hedge pattern across participants
  | "outlier" // one participant's strong signal that diverges from the rest
  | "unasked_across_cohort"; // something the brief should probe but no participant raised

export interface AggregatePattern {
  type: AggregatePatternType;
  summary: string; // 1-2 sentences
  supporting_session_ids: string[]; // which sessions evidence this pattern
  sample_quotes: { session_id: string; turn: number; text: string }[];
  strength: "strong" | "weak";
}

export interface RoundAggregate {
  generated_at: string;
  session_count: number;
  patterns: AggregatePattern[];
  top_themes: string[]; // cross-cohort theme names, ~5-10
  signal_strength_by_objective: Record<string, number>; // 0..1 per objective
  summary: string; // 1-paragraph narrative of the cohort
  // Routing recommendations — "you heard this, but you should also talk to
  // role X about Y." Produced when the aggregate surfaces findings relevant
  // to audiences adjacent to the host's original scope.
  routing_recommendations: {
    audience: string; // "your PM", "the legal team", "a clinician"
    finding: string; // what they'd want to know
    supporting_session_ids: string[];
  }[];
}

export function emptyExtraction(template: Template): ExtractionState {
  const per_objective: Record<string, ObjectiveState> = {};
  for (const obj of template.objectives) {
    per_objective[obj.id] = {
      id: obj.id,
      fields: {},
      completeness: 0,
      confidence: 0,
      key_quotes: [],
    };
  }
  return {
    per_objective,
    cross_objective: { emerging_themes: [], session_heat: "" },
  };
}
