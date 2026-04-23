import type { Template } from "./types";
import founderProductIdeation from "@/templates/founder-product-ideation.json";
import postIncidentWitness from "@/templates/post-incident-witness.json";
import civicConsultation from "@/templates/civic-consultation.json";

// Three domain-neutral briefs:
// - Founder Investment Evaluation (Investor/Founder) — Thu 2026-04-22
// - Post-Incident Witness Interview (Investigator/Witness) — Thu 2026-04-23
// - Civic Consultation (Facilitator/Resident) — Thu 2026-04-23
// Covers VC due-diligence, incident investigation, and civic engagement.
// Same four-call architecture, three completely different tones and stakes.
const templates: Template[] = [
  founderProductIdeation as unknown as Template,
  postIncidentWitness as unknown as Template,
  civicConsultation as unknown as Template,
];

export function listTemplates(): Pick<Template, "template_id" | "name" | "description">[] {
  return templates.map((t) => ({
    template_id: t.template_id,
    name: t.name,
    description: t.description,
  }));
}

export function getTemplate(id: string): Template | null {
  return templates.find((t) => t.template_id === id) ?? null;
}

export const DEFAULT_TEMPLATE_ID = "founder-product-ideation";
