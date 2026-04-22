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
  | "wrap_up";

export interface ConductorDecision {
  reasoning: string;
  move_type: MoveType;
  move_target: string;
  next_utterance: string;
}

export interface Session {
  session_id: string;
  template: Template;
  transcript: Turn[];
  extraction: ExtractionState;
  started_at: string; // ISO
  deployed_notices: { turn: number; type: string }[];
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
